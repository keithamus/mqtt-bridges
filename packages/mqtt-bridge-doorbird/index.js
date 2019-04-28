// Manual: https://www.doorbird.com/downloads/api_lan.pdf?rev=0.21

import mqtt from 'mqtt-bridge-utils'
import bonjour from 'bonjour'
import fetch from 'make-fetch-happen'
import timeout from 'p-timeout'

const discoverDoorbirdIP = async () => {
  const find = new Promise(resolve => bonjour().find({ type: 'axis-video' }, async service => {
    if (service.host.startsWith('bha-') && service.addresses.length) {
      const address = service.addresses[0]
      const html = await (await fetch(`http://${address}`)).text()
      if (html.includes('DoorBird')) {
        console.log(`Found DoorBird device on ${address}`)
        resolve(address)
      }
    }
  }))
  return await timeout(find, 10000)
}

const setupDoorbird = (user, pass, ip) => {
  const request = (page, qs) => fetch(`https://${user}:${pass}@${ip}/bha-api/${page}.cgi?${qs}`, { strictSSL: false })
  const getSession = async () => (await (await request('getsession')).json()).BHA.SESSIONID
  const requestSession = async (page, qs) => {
    const sid = await getSession()
    console.log('getting ', page, sid)
    return fetch(`http://${ip}/bha-api/${page}.cgi?sessionid=${sid}`)
  }

  return {
    info: async () => (await (await request('info')).json()).BHA.VERSION[0],
    image: async payload => (await requestSession('image')).buffer(),
    open: relay => request('open-door', `r=${relay}`),
    light: () => request('light-on'),
    restart: () => request('restart'),
    monitor: async function * monitor () {
      const res = await request('monitor', 'ring=doorbell,motionsensor')
      const boundary = (res.headers.get('content-type').match(/boundary=([^;]+)/))[1]
      for await (const chunk of res.body) {
        const events = chunk.toString().split(boundary)
        for(const event of events) {
          const res = event.trim().split('\r\n')
          const bodyIndex = res.indexOf('') + 1
          const body = res.slice(bodyIndex)
          for(const line of body) {
            const [name,state] = line.split(':')
            if (state == 'H') {
              yield name
            }
          }
        }
      }
    }
  }
}

const main = async (config) => {
  const {DOORBIRD_IP, DOORBIRD_USER, DOORBIRD_PASS} = config
  console.log('config')
  const doorbird = setupDoorbird(DOORBIRD_USER, DOORBIRD_PASS, DOORBIRD_IP ? DOORBIRD_IP : await discoverDoorbirdIP())
  console.log('found doorbird...')
  const info = await doorbird.info()
  const device = info.WIFI_MAC_ADDR
  console.log('got info, doorbird is ', device)
  const refresh = async () => {
    console.log('device....')
    mqpub(device, info)
    mqpub(`${device}/image`, await doorbird.image())
  }
  const mqpub = await mqtt(config, async (id, command, payload) => {
    if (id !== device) return
    if (!doorbird[command]) return
    // monitor is not an allowed command
    if (command === 'monitor') return
    // stop recursion of image self posting
    if (command === 'image' && payload) return
    await doorbird[command]()
    await refresh()
  })
  await refresh()
  // Begin monitoring for events
  for await (const event of doorbird.monitor()) {
    mqpub(`${device}/${event}`, await doorbird.image())
  }
}

main(Object.assign({ MQTT_ROOT: 'doorbird' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})

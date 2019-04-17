import mqtt from 'mqtt-bridge-utils'
import ssdp from 'node-ssdp'
import fetch from 'make-fetch-happen'
import delay from 'delay'
import timeout from 'p-timeout'
import forever from 'p-forever'

const tap = v => console.log(v) || v

const discoverVeraIp = async () => {
  const urn = 'urn:schemas-micasaverde-org:service:HomeAutomationGateway:1'
  const client = new ssdp.Client()
  const find = new Promise(resolve => client.on('response', (headers, code, rinfo) => {
    if (headers.ST !== urn) return
    console.log(`Found Vera hub on ${rinfo.address}`)
    resolve(rinfo.address)
  }))
  client.search(urn)
  try {
    return await timeout(find, 10000)
  } finally {
    client.stop()
  }
}

const commands = {
  '2'/* DIMMER */: {
    on: () => commands[2].level(100),
    off: () => commands[2].level(0),
    brightness: i => commands[2].level(i),
    level: i => `id=lu_action&serviceId=urn:upnp-org:serviceId:Dimming1&action=SetLoadLevelTarget&newLoadlevelTarget=${parseInt(i, 10)}`,
  },
  '3'/* SWITCH */: {
    on: () => `id=lu_action&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=1`,
    off: () => `id=lu_action&serviceId=urn:upnp-org:serviceId:SwitchPower1&action=SetTarget&newTargetValue=0`,
  },
  '7'/* LOCK */: {
    unlock: () => `id=lu_action&serviceId=urn:micasaverde-com:serviceId:DoorLock1&action=SetTarget&newTargetValue=0`,
    lock: () => `id=lu_action&serviceId=urn:micasaverde-com:serviceId:DoorLock1&action=SetTarget&newTargetValue=1`,
  },
  '8'/* WINDOW COVER */: {
    open: () => commands[8].level(100),
    close: () => commands[8].level(0),
    stop: () => `id=action&serviceId=urn:upnp-org:serviceId:WindowCovering1&action=Stop`,
    level: i => `id=lu_action&serviceId=urn:upnp-org:serviceId:Dimming1&action=SetLoadLevelTarget&newLoadlevelTarget=${parseInt(i, 10)}`
  },
}

const main = async (config) => {
  const {POLL_INTERVAL = 5, VERA_IP} = config
  const ip = VERA_IP ? VERA_IP : await discoverVeraIp()
  if (!ip) throw new Error(`Cannot find Vera IP. Please set VERA_IP environment manually`)
  const request = qs => fetch(tap(`http://${ip}:3480/data_request?output_format=json&${qs}`), { retries: 3 }).then(r => r.json())
  const deviceCache = new Map()
  const refresh = async () => {
    const {temperature, categories, rooms, devices} = await request('id=sdata')
    for (const device of devices) {
      const id = device.id
      deviceCache.set(String(id), device)
      device.category_name = (categories.find(category => category.id === device.category) || {}).name || 'Unknown'
      device.room_name = (rooms.find(room => room.id === device.room) || {}).name || 'Unknown'
      mqpub(device.id, device)
    }
    await delay(POLL_INTERVAL * 1000)
  }
  const mqpub = await mqtt(config, async (id, command, payload) => {
    const device = deviceCache.get(id)
    if (device && commands[device.category] && commands[device.category][command]) {
      await request(`DeviceNum=${id}&${commands[device.category][command](payload)}&rand=${Math.random()}`)
    }
    await refresh()
  })
  return forever(refresh) 
}

main(Object.assign({ MQTT_ROOT: 'vera' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})

import mqtt from 'mqtt-bridge-utils'
import bonjour from 'bonjour'
import {EventEmitter} from 'events'
import {Client, Application, MediaController} from 'castv2-client'
import knownApps from './chromecastapplist.json'
import {extname} from 'path'
import {getType} from 'mime'
import tts from 'google-tts-api'

const detectMime = file => getType(extname(file))

const clients = new Map()
const discoverChromeCasts = () => {
  const ee = new EventEmitter()
  bonjour().find({ type: 'googlecast' }, service => {
    const address = service.referer.address
    const {name, fqdn} = service
    if (clients.get(name)) return
    const client = new Client()
    clients.set(name, client)
    client.name = name
    client.fqdn = fqdn
    client.connect(address, () => {
      ee.emit('new', client)
    })
    client.getState = appids => new Promise((resolve, reject) => {
      client.getStatus((err, status) => {
        if (err) return reject(err)
        client.getAppAvailability(appids, (err, availability) => {
          if (err) return reject(err)
          client.getSessions((err, sessions) => {
            if (err) return reject(err)
            const apps = []
            for (const appid in availability) {
              if (availability[appid]) {
                const app = knownApps.find(app => app.app_id === appid) || { app_id: appid }
                apps.push(app)
              }
            }
            resolve(Object.assign({ address, name, fqdn, apps, sessions }, status))
          })
        })
      })
    })
  })
  return ee
}


const sessionCommands = [
  'getStatus', 'load', 'play', 'pause', 'stop', 'seek',
  'queueLoad', 'queueInsert', 'queueRemove', 'queueReorder', 'queueUpdate'
]
const createApp = APP_ID => {
  const app = class extends Application {
    constructor(...args) {
      super(...args)
      this.media = this.createController(MediaController)
      this.media.on('status', status => this.emit('status', status))
      sessionCommands.forEach(command => this[command] = this.media[command].bind(this.media))
    }
  }
  app.APP_ID = APP_ID
  return app
}

const defaultMediaAppID = 'CC1AD845'
const appids = (knownApps.map(app => app.app_id).filter(Boolean))
const main = async (config) => {
  const mqpub = await mqtt(config, async (id, command, payload) => {
    if (!clients.has(id)) return
    const client = clients.get(id)
    await new Promise((resolve, reject) => {
      if (command === 'playfile') {
        client.launch(createApp(defaultMediaAppID), (err, session) => {
          session.load({
            contentId: payload,
            contentType: detectMime(payload),
            streamType: 'BUFFERED'
          }, { autoplay: true }, () => {
            resolve()
          })
        })
      } else if (command === 'tts') {
        tts(payload, 'en', 1.1)
          .then(contentId => {
            client.launch(createApp(defaultMediaAppID), (err, session) => {
              session.load({
                contentId,
                contentType: 'audio/mpeg',
                streamType: 'BUFFERED'
              }, { autoplay: true }, () => {
                resolve()
              })
            })
          }, reject)
      } else if (command === 'launch') {
          const appid = payload || defaultMediaAppID
          console.log('launching...', appid)
          client.launch(createApp(appid), (err, session) => {
            console.log('launched', appid)
            client.session = session
            resolve()
          })
      } else if (client.session && sessionCommands.includes(command)) {
        client.session[command](payload, () => {
          console.log('ran command', command)
          resolve()
        })
      }
    })
    mqpub(client.name, await client.getState(appids))
  })
  const casts = discoverChromeCasts()
  casts.on('new', async client => {
    mqpub(client.name, await client.getState(appids))
  })
}

main(Object.assign({ MQTT_ROOT: 'googlecast' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})

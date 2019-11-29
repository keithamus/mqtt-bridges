// Manual: https://www.doorbird.com/downloads/api_lan.pdf?rev=0.21
import {discover} from '../protocols/bonjour'
import {client, Client} from '../protocols/http'
import {Service} from '../service'
import {Device} from '../device'

export interface DoorBirdServiceConfig {
  user?: string,
  pass?: string,
  devices?: DoorBirdDeviceConfig[],
}
export interface DoorBirdDeviceConfig {
  name: string
  ip: string,
  user: string,
  pass: string,
}

export class DoorBirdService extends Service<DoorBirdDevice> {
  public name = "doorbird"
  
  private globalUser: string
  private globalPass: string
  
  get config(): DoorBirdServiceConfig {
    return {
      devices: this.devices.map(d => d.config)
    }
  }
  
  constructor({user = "", pass = "", devices = []}: DoorBirdServiceConfig) {
    super()
    this.globalUser = user
    this.globalPass = pass
    for (const device of devices || {}) {
      this.devices.push(new DoorBirdDevice(device, this))
    }
  }

  async * discover(): AsyncGenerator<DoorBirdDevice, void, void> {
    for await (const service of discover({type: 'axis-video'})) {
      const host = service.host.match(/^bha-([A-F0-9]+).local$/)
      const ip = (service as any).addresses?.pop()
      if (host && host[1] && ip && service.name.startsWith('Door')) {
        if (!this.devices.find(device => device.config.ip === ip)) {
          const device = new DoorBirdDevice({
            name: host[1],
            ip: ip,
            user: this.globalUser,
            pass: this.globalPass,
          }, this)
          this.devices.push(device)
          yield device
        }
      }
    }
  }

}

class DoorBirdDevice extends Device<DoorBirdDeviceConfig> {
  private fetchAuth: Client
  private fetchAnon: Client

  get name(): string {
    return this.config.name
  }
  
  constructor(config: DoorBirdDeviceConfig, service: DoorBirdService) {
    super(config, service)
    const baseUrl = `${this.config.ip}/bha-api/`
    this.fetchAuth = client(`http://${this.config.user}:${this.config.pass}@${baseUrl}`)
    this.fetchAnon = client(`http://${baseUrl}`)
  }

  async start(): Promise<void> {
    await this.info()
    this.stream()
  }

  async stream(): Promise<void> {
    // Start the streaming HTTP request `monitor.cgi`
    const res = await this.fetchAuth('monitor.cgi?ring=doorbell,motionsensor')
    const contentType = res.headers.get('content-type')
    if (!contentType) throw new Error('missing content-type header')
    const match = contentType.match(/boundary=([^;]+)/)
    if (!match || !match[1]) throw new Error('missing content-type boundary field')
    const boundary = match[1]
    if (!res.body) throw new Error('missing body')
    for await (const chunk of res.body) {
      const boundedChunk = chunk.toString().split(boundary)
      for(const chunk of boundedChunk) {
        const events = chunk.trim().split('\r\n')
        for(const event of events) {
          if (event === '') continue
          const [name, state] = event.split(':')
          if (state == 'H') {
            this.emit(name, await this.image())
          }
        }
      }
    }
  }

  async stop() {
    return
  }

  async command(topic: string, payload: string | Buffer): Promise<void> {
    switch (topic) {
      case 'image/get': return this.emit('image', await this.image())
      case 'info': return await this.info()
      case 'light':
        await this.fetchAuth('light-on.cgi')
        return await this.info()
      case 'restart':
        await this.fetchAuth('/restart.cgi')
        return await this.info()
      case 'open':
        const relays = (await (await this.fetchAuth('info.cgi')).json())?.BHA?.VERSION?.[0]?.RELAYS || []
        if (!relays.includes(String(payload))) return
        await this.fetchAuth(`/open-door.cgi?r=${payload}`)
        return await this.info()
      case 'sound':
        if (!(payload instanceof Buffer)) return
        await this.fetchAuth('/audio-transmit.cgi', {
          headers: {
            'Content-Type': 'audio/basic',
            'Content-Length': String(payload.byteLength),
            'Cache-Control': 'no-cache'
          },
          body: payload
        })
        return await this.info()
    }
  }
  
  async image(): Promise<Buffer> {
    const sessId = (await (await this.fetchAuth('getsession.cgi')).json()).BHA.SESSIONID
    const res = await this.fetchAnon(`image.cgi?sessionid=${sessId}`)
    return await res.buffer()
  }

  async info(): Promise<void> {
    const json = (await (await this.fetchAuth('info.cgi')).json())?.BHA?.VERSION[0]
    if (json.FIRMWARE) this.emit('firmware', json.FIRMWARE)
    if (json.BUILD_NUMBER) this.emit('buildnumber', json.BUILD_NUMBER)
    if (json.PRIMARY_MAC_ADDR) this.emit('mac', json.PRIMARY_MAC_ADDR)
    if (json.RELAYS) this.emit('relays', json.RELAYS.join(','))
    if (json['DEVICE-TYPE']) this.emit('type', json['DEVICE-TYPE'])
  }

}

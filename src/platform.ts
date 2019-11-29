import {Device} from './device'
import {Service} from './service'
import {MQTTClient, MQTTConfig} from './protocols/mqtt'
import {DoorBirdService, DoorBirdServiceConfig} from './plugins/doorbird'
import {SuncalcService, SuncalcServiceConfig} from './plugins/suncalc'
import {FluxService, FluxServiceConfig} from './plugins/flux'

interface PlatformConfig {
  env: boolean,
  rewrite: boolean,
  discover: boolean,
  mqtt: MQTTConfig,
  doorbird: DoorBirdServiceConfig,
  suncalc: SuncalcServiceConfig,
  flux: FluxServiceConfig,
}

interface DevicesMap {
  doorbird: DoorBirdService
  suncalc: SuncalcService
  flux: FluxService
}

const stopping = new WeakSet()
export class Platform {
  private services: Partial<DevicesMap> = {}
  private devices: Device<unknown>[] = []
  private client: MQTTClient
  public config: Partial<PlatformConfig>

  constructor(config: Partial<PlatformConfig>, public onDevice?: () => void) {
    this.config = Object.assign({discover: false}, config)
    this.config.discover = Boolean(this.config.discover)
    this.client = new MQTTClient(this.config.mqtt || {})
    if (this.config.doorbird) {
      console.log('Registering service doorbird')
      this.services.doorbird = new DoorBirdService(this.config.doorbird)
    }
    if (this.config.suncalc) {
      console.log('Registering service suncalc')
      this.services.suncalc = new SuncalcService(this.config.suncalc)
    }
    if (this.config.flux) {
      console.log('Registering service suncalc')
      this.services.flux = new FluxService(this.config.flux)
    }
  }

  async start(): Promise<void> {
    await this.client.start()
    const started = []
    for (const service of Object.values(this.services)) {
      if (!service) continue
      console.log(`Starting device ${service.name}`)
      started.push(this.startService(service))
      if (this.config.discover) {
        console.log(`Discovering devices from ${service.constructor.name}`)
        started.push(this.discoverService(service))
      }
    }
    for await (const [topic, payload] of this.client) {
      const [name, id, ...rest] = topic.split('/')
      const service = this.services[name as keyof DevicesMap]
      if (service) {
        const device = service.getDevice(id)
        if (device) {
          await device.command(rest.join('/'), payload)
        }
      }
    }
    await Promise.all(started)
  }

  async startService(service: Service<Device<unknown>>): Promise<void> {
    const started = []
    console.log(`Starting known devices on ${service.constructor.name}`)
    for (const device of service.devices) {
      console.log(`Booting up service ${service.constructor.name}`)
      started.push(this.startDevice(device))
    }
    await Promise.all(started)
  }

  async discoverService(service: Service<Device<unknown>>): Promise<void> {
    const started = []
    for await (const device of service.discover()) {
      console.log(`New ${device.constructor.name} discovered`)
      started.push(this.startDevice(device))
    }
    await Promise.all(started)
  }

  async startDevice(device: Device<unknown>): Promise<void> {
    this.devices.push(device)
    this.onDevice?.()
    const topic = `${device.service.name}/${device.name}/#`
    console.log(`Subscribing on ${topic}`)
    await this.client.subscribe(topic)
    for (let retries = 0; retries < 5; retries += 1) {
      if (stopping.has(device)) return
      console.log(`${retries ? 'Rebooting' : 'Booting'} ${device.service.name} ${device.name}`)
      try {
        await device.start()
        console.log('Device started')
        for await (const [subTopic, payload] of device) {
          const topic = `${device.service.name}/${device.name}/${subTopic}`
          console.log(`Publishing ${topic}`)
          this.client.publish(topic, payload)
        }
      } catch (error) {
        console.log(`Device ${device.constructor.name} failed with error`, error)
      }
    }
    console.log(`Gave up on device ${device.constructor.name} after 5 tries`)
  }

  async stop(): Promise<void> {
    for (const device of this.devices) {
      stopping.add(device)
      await device.stop()
    }
    await this.client.stop()
  }

  generateConfig(): Partial<PlatformConfig> {
    return {
      env: this.config.env,
      rewrite: this.config.rewrite,
      discover: this.config.discover,
      mqtt: this.config.mqtt,
      doorbird: this.services.doorbird?.config,
      suncalc: this.services.suncalc?.config,
    }
  }
}

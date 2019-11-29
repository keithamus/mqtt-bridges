// Manual: https://www.doorbird.com/downloads/api_lan.pdf?rev=0.21
import suncalc from 'suncalc'
import {Service} from '../service'
import {Device} from '../device'

export interface SuncalcServiceConfig {
  user?: string,
  pass?: string,
  devices?: SuncalcDeviceConfig[],
}
export interface SuncalcDeviceConfig {
  name: string
  latitude: number,
  longitude: number,
  interval: number,
}

export class SuncalcService extends Service<SuncalcDevice> {
  public name = "suncalc"
  
  get config(): SuncalcServiceConfig {
    return {
      devices: this.devices.map(d => d.config)
    }
  }
  
  constructor({devices = []}: SuncalcServiceConfig) {
    super()
    for (const device of devices || {}) {
      this.devices.push(new SuncalcDevice(device, this))
    }
  }

}

const radToDeg = (rad: number) => rad * (180 / Math.PI)

class SuncalcDevice extends Device<SuncalcDeviceConfig> {
  private stopped = false
  
  get name(): string {
    return this.config.name
  }

  constructor(config: SuncalcDeviceConfig, service: SuncalcService) {
    super(config, service)
    this.config.interval = Math.max(this.config.interval || 10, 10)
  }
  
  async start(): Promise<void> {
    this.stream()
  }

  async stream(): Promise<void> {
    while (!this.stopped) {
      const args: [Date, number, number] = [new Date(), this.config.latitude, this.config.longitude]
      const pos = suncalc.getPosition(...args)
      for (const key in pos) this.emit(`sun/${key}`, String(pos[key as keyof typeof pos]))
      this.emit('sun/azimuthDegrees', String(radToDeg(pos.azimuth)))
      this.emit('sun/altitudeDegrees', String(radToDeg(pos.altitude)))
      
      const moonPos = suncalc.getMoonPosition(...args)
      for (const key in moonPos) this.emit(`moon/${key}`, String(moonPos[key as keyof typeof moonPos]))
      this.emit('moon/azimuthDegrees', String(radToDeg(moonPos.azimuth)))
      this.emit('moon/altitudeDegrees', String(radToDeg(moonPos.altitude)))
      
      const times = suncalc.getTimes(...args)
      for (const key in times) this.emit(`sun/${key}`, times[key as keyof typeof times].toJSON())
      
      const moonTimes = suncalc.getMoonTimes(...args)
      for (const key in moonTimes) {
        const value = moonTimes[key as keyof typeof moonTimes]
        this.emit(`moon/${key}`, typeof value === 'boolean' ? String(Number(value)) : value.toJSON())
      }
      
      const moonIllumination = suncalc.getMoonIllumination(args[0])
      for (const key in moonIllumination) this.emit(`moon/${key}`, String(moonIllumination[key as keyof typeof moonIllumination]))
      await new Promise(resolve => setTimeout(resolve, this.config.interval * 1000))
    }
  }

  async stop() {
    this.stopped = true
    return
  }

  async command(topic: string, payload: string | Buffer): Promise<void> {
  }

}

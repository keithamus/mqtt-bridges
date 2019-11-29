import {Service} from '../service'
import {Device} from '../device'
import suncalc from 'suncalc'
import ktorgb from 'kelvin-to-rgb'

const clamp = (i: number, max: number, min = 0) => Math.round(Math.max(Math.min(i, max), min))
const timeFactor = (s: Date, t: Date, e: Date) => Math.round((100 / (Number(e) - Number(s))) * (Number(t) - Number(s)))
const easeOutCubic = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.99, 0.99, 0.99, 0.99,
  0.99, 0.99, 0.99, 0.98, 0.98, 0.98, 0.98, 0.98, 0.97, 0.97, 0.97, 0.96, 0.96,
  0.96, 0.95, 0.95, 0.95, 0.94, 0.94, 0.93, 0.93, 0.92, 0.91, 0.91, 0.9, 0.9,
  0.89, 0.88, 0.88, 0.87, 0.86, 0.85, 0.84, 0.83, 0.82, 0.81, 0.8, 0.79, 0.78,
  0.77, 0.76, 0.75, 0.74, 0.73, 0.71, 0.7, 0.69, 0.67, 0.66, 0.64, 0.63, 0.61,
  0.59, 0.58, 0.56, 0.54, 0.53, 0.51, 0.49, 0.47, 0.45, 0.43, 0.41, 0.39, 0.36,
  0.34, 0.32, 0.3, 0.27, 0.25, 0.22, 0.2, 0.17, 0.14, 0.12, 0.09, 0.06, 0.03, 0
]
const easeOutQuad = [
  1, 1, 1, 1, 1, 1, 1, 0.99, 0.99, 0.99, 0.99, 0.99, 0.98, 0.98, 0.98, 0.97,
  0.97, 0.97, 0.96, 0.96, 0.96, 0.95, 0.95, 0.94, 0.94, 0.93, 0.93, 0.92, 0.92,
  0.91, 0.9, 0.9, 0.89, 0.88, 0.88, 0.87, 0.86, 0.86, 0.85, 0.84, 0.83, 0.82,
  0.82, 0.81, 0.8, 0.79, 0.78, 0.77, 0.76, 0.75, 0.74, 0.73, 0.72, 0.71, 0.7,
  0.69, 0.68, 0.66, 0.65, 0.64, 0.63, 0.62, 0.6, 0.59, 0.58, 0.56, 0.55, 0.54,
  0.52, 0.51, 0.5, 0.48, 0.47, 0.45, 0.44, 0.42, 0.41, 0.39, 0.38, 0.36, 0.34,
  0.33, 0.31, 0.29, 0.28, 0.26, 0.24, 0.23, 0.21, 0.19, 0.17, 0.15, 0.14, 0.12,
  0.1, 0.08, 0.06, 0.04, 0.02, 0
]
const easeInQuad = easeOutQuad.reverse()
const easeInOutQuart = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01,
  0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.04, 0.04, 0.05, 0.06, 0.07, 0.07, 0.09,
  0.1, 0.1, 0.12, 0.14, 0.15, 0.17, 0.18, 0.2, 0.23, 0.25, 0.28, 0.3, 0.33, 0.36,
  0.39, 0.42, 0.46, 0.5, 0.54, 0.57, 0.61, 0.64, 0.67, 0.7, 0.72, 0.75, 0.78,
  0.79, 0.81, 0.83, 0.85, 0.86, 0.88, 0.9, 0.91, 0.92, 0.93, 0.94, 0.95, 0.95,
  0.96, 0.97, 0.97, 0.97, 0.98, 0.98, 0.98, 0.98, 0.99, 0.99, 0.99, 0.99, 0.99,
  0.99, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
]

const rgbtohex = ([r, g, b]: [number, number, number]) =>
  `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`

export interface FluxServiceConfig {
  user?: string,
  pass?: string,
  devices?: FluxDeviceConfig[],
}
export interface FluxDeviceConfig {
  name: string
  latitude: number,
  longitude: number,
  interval: number,
  maxBrightness: number,
  minBrightness: number,
  maxKelvin: number,
  minKelvin: number,
}

export class FluxService extends Service<FluxDevice> {
  public name = "flux"
  
  get config(): FluxServiceConfig {
    return {
      devices: this.devices.map(d => d.config)
    }
  }
  
  constructor({devices = []}: FluxServiceConfig) {
    super()
    for (const device of devices || {}) {
      this.devices.push(new FluxDevice(device, this))
    }
  }

}

class FluxDevice extends Device<FluxDeviceConfig> {
  private stopped = false
  private maxB: number
  private minB: number
  private maxK: number
  private minK: number
  
  get name(): string {
    return this.config.name
  }

  constructor(config: FluxDeviceConfig, service: FluxService) {
    super(config, service)
    this.config.interval = Math.max(this.config.interval || 10, 10)
    this.maxB = this.config.maxBrightness
    this.minB = this.config.minBrightness
    this.maxK = this.config.maxKelvin
    this.minK = this.config.minKelvin
  }
  
  async start(): Promise<void> {
    this.stream()
  }

  async stream(): Promise<void> {
    let lastBrightness = 0
    let lastK = 0
    while (!this.stopped) {
      const time = new Date()
      const {sunrise, solarNoon} = suncalc.getTimes(time, this.config.latitude, this.config.longitude)
      const midnight = new Date()
      midnight.setHours(23, 59, 59, 999)
      sunrise.setDate(time.getDate()) // sometimes a bug happens with SunCalc where sunrise is yesterday
      solarNoon.setDate(time.getDate()) // sometimes a bug happens with SunCalc where noon is yesterday
      const {minB, maxB, minK, maxK} = this
      let brightness = minB
      let k = minK
      if (time > sunrise && time < solarNoon) {
        brightness =
          minB +
          (maxB - minB) * easeOutCubic[timeFactor(sunrise, time, solarNoon)]
        k =
          minK +
          (maxK - minK) * easeInOutQuart[timeFactor(sunrise, time, solarNoon)]
      } else if (time >= solarNoon && time < midnight) {
        brightness =
          minB +
          (maxB - minB) * (1 - easeInQuad[timeFactor(solarNoon, time, midnight)])
        k =
          minK +
          (maxK - minK) * (1 - easeOutQuad[timeFactor(solarNoon, time, midnight)])
      }
      k = Math.round(clamp(k, maxK, minK) / 100) * 100
      brightness = clamp(brightness, maxB, minB)
      this.emit('time', time.toJSON())
      if (brightness !== lastBrightness) {
        lastBrightness = brightness
        this.emit('brightness', String(lastBrightness))
      }
      if (k !== lastK) {
        lastK = k
        this.emit('k', String(lastK))
        this.emit('rgb', String(ktorgb(lastK)))
        this.emit('hex', String(rgbtohex(ktorgb(lastK))))
      }
    }
  }

  async stop() {
    this.stopped = true
    return
  }

  async command(topic: string, payload: string | Buffer): Promise<void> {
    switch (topic) {
      case 'maxbrightness':
        this.maxB = Number(payload)
        return
      case 'minbrightness':
        this.minB = Number(payload)
        return
      case 'maxkelvin':
        this.maxK = Number(payload)
        return
      case 'minkelvin':
        this.minK = Number(payload)
        return
    }
  }
}

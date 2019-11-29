import mqtt, {Client} from 'mqtt'
import { EventIterator } from 'event-iterator'

export interface MQTTConfig {
  host: string
  port: string
  username: string
  password: string
  clientId: string
  root: string
  protocol: string
}

export class MQTTClient {
  config: MQTTConfig
  private client: Client | null = null

  constructor(config: Partial<MQTTConfig>) {
    this.config = Object.assign(
      {
        protocol: 'mqtts',
        host: 'localhost',
        port: '8883',
        username: '',
        password: '',
        clientId:
          'mqtt-bridge-' +
          Math.random()
            .toString(16)
            .substr(2, 8),
        root: '',
      },
      config,
    )
    if (this.config.root && !this.config.root.endsWith('/')) {
      this.config.root += '/'
    }
  }

  async start(): Promise<void> {
    console.log('MQTT client started')
    const client = this.client = mqtt.connect(this.config)
    return new Promise((resolve, reject) => {
      client.once('connect', () => {
        console.log('MQTT connection established')
        client.off('error', reject)
        resolve()
      })
      client.once('error', reject)
    })
  }

  [Symbol.asyncIterator](): AsyncIterator<[topic: string, payload: Buffer]> {
    if (!this.client) throw new Error(`iterator called without starting client`)
    const client = this.client
    const iter = new EventIterator<[topic: string, payload: Buffer]>(({push, stop, fail}) => {
      client.on('message', (topic: string, payload: Buffer) => push([topic, payload]))
      let reconnectCount = 0
      client.on('reconnect', (err: Error) => {
        if (reconnectCount > 10) {
          console.log('MQTT disconnected too many times', err)
          return fail(err)
        }
        reconnectCount += 1
        console.log(`MQTT reconnecting (attempt ${reconnectCount} of 10)`, err)
      })
      client.on('end', stop)
      client.on('error', fail)
      return () => {
        client.end()
      }
    })
    return iter[Symbol.asyncIterator]()
  }

  async stop(): Promise<void> {
    return new Promise(resolve => this.client?.end(false, {}, resolve))
  }

  async subscribe(topic: string, opts: {qos: 0 | 1 | 2} = {qos: 0}): Promise<void> {
    return new Promise(resolve => this.client?.subscribe(`${this.config.root}${topic}`, opts, () => resolve()))
  }

  async publish(
    topic: string,
    payload: string | Buffer,
    opts: {qos: 0 | 1 | 2} = {qos: 0},
  ): Promise<void> {
    return new Promise(resolve => {
      if (!this.client) return resolve()
      this.client?.publish(`${this.config.root}${topic}`, payload, opts, () => resolve())
    })
  }
}

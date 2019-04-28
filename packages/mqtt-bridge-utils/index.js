import mqtt from 'mqtt'

const repeatMessageCache = new Map()
export default async ({ MQTT_HOST = 'localhost', MQTT_PORT = '8883', MQTT_USER, MQTT_PASS, MQTT_CLIENT_ID, MQTT_ROOT }, issueCommand) => {
  let reconnectCount = 0
  console.log(`Attempting to connect to mqtt ${MQTT_USER}:***@${MQTT_HOST || 'localhost'}`)
  const mq = mqtt.connect({
    protocol: 'mqtts',
    host: MQTT_HOST,
    port: MQTT_PORT,
    clientId: MQTT_CLIENT_ID || 'mqtt-bridge-' + Math.random().toString(16).substr(2, 8),
    username: MQTT_USER,
    password: MQTT_PASS,
  })
  mq.on('error', err => console.log(`mqtt connection errored`, err))
  mq.on('connect', () => reconnectCount = 0)
  mq.on('reconnect', err => {
    console.log(`mqtt reconnecting`, err)
    reconnectCount += 1
    if (reconnectCount > 10) {
      console.error('Tried too many times to connect to mqtt broker. Are you sure the username and password are correct?')
      process.exit(1)
    }
  })
  mq.on('offline', err => console.log(`mqtt is offline`, err))
  await (new Promise(resolve => mq.once('connect', resolve)))
  console.log(`Established mqtt connection on ${MQTT_HOST}:${MQTT_PORT}`)
  mq.on('message', async (topic, message) => {
    const parts = topic.split('/')
    if (parts[0] !== MQTT_ROOT) return
    if (!parts[1] || !parts[2]) return
    try {
      message = JSON.parse(message.toString())
    } catch(e) {
      message = message.toString()
    }
    try {
      await issueCommand(parts[1], parts[2], message)
    } catch(e) {
      console.error(e.stack || e)
      process.exit(1)
    }
  })
  mq.subscribe(`${MQTT_ROOT}/+/+`, (err, granted) => {
    if (err) {
      console.error(`Could not subscribe to command topics`, err)
      process.exit(1)
    }
  })
  return (id, value, opts = { retain: true }) => {
    const topic = `${MQTT_ROOT}/${id}`
    if (!(value instanceof Uint8Array)) {
      value = JSON.stringify(value)
    }
    if (repeatMessageCache.get(topic) === value) return
    repeatMessageCache.set(topic, value)
    mq.publish(topic, value, opts)
  }
}

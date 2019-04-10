import mqtt from 'mqtt-bridge-utils'
import tesla from 'teslajs'
import delay from 'delay'
import retry from 'p-retry'
import forever from 'p-forever'


const disallowedCommands = new Set([
  'login', 'refreshToken', 'get_command', 'post_command',
  'vehicle', 'vehicles', 'vehicleData', 'vehicleState', 'vehicleConfig',
  'climateState', 'driveState', 'chargeState', 'nearbyChargers', 'guiSettings', 'mobileEnabled',
])

const commands = {
  default: () => [],
  scheduleSoftwareUpdate: ms => [Number(ms || 0)],
  setSentryMode: onoff => [Boolean(onoff)],
  navigationRequest: ([subject, text, locale]) => [String(subject), String(text), String(locale)],
  speedLimitActivate: pin => [Number(pin || 1234)],
  speedLimitClearPin: pin => [Number(pin || 1234)],
  speedLimitSetLimit: limit => [Number(limit || 70)],
  seatHeater: ([seat, level]) => [Number(seat || 0), Number(level || 3)],
  steeringHeater: amt => [Number(amt)],
  setChargeLimit: amt => [Number(amt)],
  sunRoofControl: state => [state === 'vent' ? 'vent' : 'close'],
  sunRoofMove: pc => [Number(pc)],
  setTemps: ([driver, passenger]) => [Number(driver || 20), Number(passenger || 20)],
  remoteStart: pass => [String(pass)],
  openTrunk: which => [state === 'front' ? 'front' : 'rear'],
  setValetMode: ([onoff, pin]) => [Boolean(onoff), Number(pin)],
  calendar: entry => [entry],
  homelink: ([lat, long, token]) => [Number(lat), Number(long), String(token)],
}

const main = async (config) => {
  const {POLL_INTERVAL = 60, TESLA_EMAIL, TESLA_PASS} = config
  if (!TESLA_EMAIL || !TESLA_PASS) throw new Error(`Must provide TESLA_EMAIL and TESLA_PASSWORD environment variables`)
  const {body, authToken, refreshToken} = await tesla.loginAsync(TESLA_EMAIL, TESLA_PASS)
  const vehicleIDs = new Set()
  const refresh = async () => {
    const vehicles = await tesla.vehiclesAsync({ authToken })
    for (const vehicle of vehicles) {
      const vehicleID = vehicle.id_s
      vehicleIDs.add(vehicleID)
      mqpub(vehicleID, await tesla.vehicleDataAsync({ authToken, vehicleID }))
    }
    await delay(POLL_INTERVAL * 1000)
  }
  const mqpub = await mqtt(config, async (vehicleID, command, payload) => {
    console.log(vehicleID, command, vehicleIDs, disallowedCommands.has(command))
    if (!vehicleIDs.has(vehicleID)) return
    if (disallowedCommands.has(command)) return
    if (typeof tesla[`${command}Async`] !== 'function') return
    const args = commands[command] ? commands[command](payload) : [] 
    console.log('issuing command', command, ...args)
    await tesla[`${command}Async`]({ authToken, vehicleID }, ...args)
    await refresh()
  })
  return forever(refresh) 
}

main(Object.assign({ MQTT_ROOT: 'tesla' }, process.env)).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})

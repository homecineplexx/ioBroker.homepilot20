/* jshint -W097 */ // jshint strict:false
/*jslint node: true */

"use strict";
var CryptoJS = require("crypto-js");			//used from Rademacher to encrypt the password
var utils = require('@iobroker/adapter-core'); // Get common adapter utils
var request = require('request');
var HashMap = require('hashmap');

var actuatorCreateHashmap = new HashMap();
var sensorCreateHashmap = new HashMap();
var transmitterCreateHashmap = new HashMap();
var sceneCreateHashmap = new HashMap();
var writeStateHashmap = new HashMap();

var lang = 'de';
var ip = '';
var sync_actuators = 4;
var sync_sensors = 3;
var sync_transmitters = 2;
var sync_scenes = 5;
var password;
var saltedPassword;
var passwordSalt;
var cookie;
var isBridge = false;

// needed variable
var path;
var deviceRole;
var deviceType;
var additionalDeviceSettings = [];
var additionalSensorSettings = [];
var additionalTransmitterSettings = [];
var callMainInterval = null;

request = request.defaults({jar: true})

const requestPromise = (url) => {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                resolve({ response, body });
            }
        });
    });
};

async function asyncRequest(url) {
	try {
        const { response, body } = await requestPromise(url);
        return { statusCode: response.statusCode, body };
    } catch (error) {
        console.error('Fehler beim Request:', error);
        throw error;
    }
}

let adapter;
function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
		name: 'homepilot20',
		systemConfig: true,
		useFormatDate: true,
		stateChange: function(id, state) {
        if (!id || !state || state.ack) return;
			adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
			adapter.log.debug('input value: ' + state.val.toString());
			controlHomepilot(id, state.val.toString());
		},
		unload: function(callback) {
			try {
				adapter.log.info('terminating homepilot20 adapter');
				stopReadHomepilot();
				callback();
			} catch (e) {
				callback();
			}
		},
		ready: function() {
			adapter.log.debug('initializing objects');
			main();
		}
		});
	adapter = new utils.Adapter(options);

	return adapter;
};

function controlHomepilot(id, input) {
	adapter.log.debug('id: ' + id + ', command: ' + input);
	
	var sid;
	var deviceIdNumber_array;
	var deviceId;
	var deviceNumberId;
	var controller_array = id.split('.');
	var calcMethod = 'PUT';
	var data; 
	var calcUri;
	
	if (id.indexOf('.Scene.') !== -1) {
		sid = controller_array[3];
		calcUri = 'http://' + ip + '/scenes/' + sid + '/actions';
		calcMethod = 'POST';
	} else {
		deviceIdNumber_array = controller_array[3].split('-');
		deviceId = deviceIdNumber_array[0];
		deviceNumberId = deviceNumberNormalize(deviceIdNumber_array[1]);
	}
		
	if (id.indexOf('AUTO_MODE_CFG') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"AUTO_MODE_CFG", "value":"' + input + '"}';
	} else if (id.indexOf('TIME_AUTO_CFG') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"TIME_AUTO_CFG", "value":"' + input + '"}';
	} else if (id.indexOf('CONTACT_AUTO_CFG') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"CONTACT_AUTO_CFG", "value":"' + input + '"}';
	} else if (id.indexOf('SUN_AUTO_CFG') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"SUN_AUTO_CFG", "value":"' + input + '"}';
	} else if (id.indexOf('DAWN_AUTO_CFG') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"DAWN_AUTO_CFG", "value":"' + input + '"}';
	} else if (id.indexOf('DUSK_AUTO_CFG') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"DUSK_AUTO_CFG", "value":"' + input + '"}';
	} else if (id.indexOf('WIND_AUTO_CFG') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"WIND_AUTO_CFG", "value":"' + input + '"}';
	} else if (id.indexOf('RAIN_AUTO_CFG') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"RAIN_AUTO_CFG", "value":"' + input + '"}';
	} else 
	
	//role == switch or role == light.switch
	if (id.indexOf('Position_inverted') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		
		if (0 >= parseInt(input)) {
			input = 0;
		} else if (parseInt(input) >= 100) {
			input = 100;
		}

		data = '{"name":"GOTO_POS_CMD", "value":"' + (100 - parseInt(input)) + '"}';		 
	} else if (id.indexOf('slatposition') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		
		if (deviceNumberId == '36500172' /*DuoFern-TrollBasis-5615*/ ||
		    deviceNumberId == '35000662' /*DuoFern-Rohrmotor-Aktor*/) {
			if (0 >= parseInt(input)) {
				input = 0;
			} else if (parseInt(input) >= 100) {
				input = 100;
			}

			data = '{"name":"SET_SLAT_POS_CMD", "value":"' + parseInt(input) + '"}';
		}
	} else if (id.indexOf('Position') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		
		if (deviceNumberId == '35002414' /*Z-Wave Steckdose*/ ||
			deviceNumberId == '35000262' /*DuoFern-2-Kanal-Aktor-9470-2*/ ||
			deviceNumberId == '35001164' /*DuoFern-Zwischenstecker-Schalten-9472*/ ||
			deviceNumberId == '11301001' /*Zwischenstecker smart-11301001*/ ||
			deviceNumberId == '32501972' /*DuoFern-Mehrfachwandtaster-230V-9494-2*/ ||
			deviceNumberId == '32501772' /*DuoFern-Bewegungsmelder-9484*/ ||
			deviceNumberId == '99999960' /*NoName Zwischenstecker*/ ||
			deviceNumberId == '35204011' /*DeltaDore-Zigbee-Stick-Easy Plug F16EM*/) {
			
			data = '{"name":"TURN_OFF_CMD"}'; 
			
			if (input == 'true') {
				data = '{"name":"TURN_ON_CMD"}';
			}
		//role == level.blind
		} else if (deviceNumberId == '35000864' /*DuoFern-Connect-Aktor-9477*/ ||
					deviceNumberId == '14234511' /*DuoFern-RolloTronStandard*/ ||
					deviceNumberId == '10142345' /*Gurtwickler RolloTron classic smart 10142345*/ ||
					deviceNumberId == '10251530' /*DuoFern-RolloTron pure smart Aufputz Minigurt*/ ||
					deviceNumberId == '35000662' /*DuoFern-Rohrmotor-Aktor*/ ||
					deviceNumberId == '10941001' /*DuoFern-Rollladenaktor smart Unterputz*/ ||
					deviceNumberId == '31500162' /*DuoFern-Rohrmotorsteuerung*/ ||
					deviceNumberId == '36500172' /*DuoFern-TrollBasis-5615*/ ||
					deviceNumberId == '27601565' /*DuoFern-Rohrmotor*/ ||
					deviceNumberId == '45059071' /*RolloPort-SX5-DuoFern-RP-SX5DF-900N-3*/ ||
					deviceNumberId == '35000462' /*DuoFern-Universal-Dimmaktor*/ ||
					deviceNumberId == '35140462' /*DuoFern-UniversalDimmer-9476*/ ||
					deviceNumberId == '36500572' /*Duofern-Troll-Comfort-5665*/ ||
					deviceNumberId == '32000064' /*DuoFern-Umweltsensor*/ ||
					deviceNumberId == '16234511' /*DuoFern-RolloTron-Comfort-1800/1805/1840*/ ||
                    deviceNumberId == '10182345' /*DuoFern-RolloTron premium smart*/ ||
                    deviceNumberId == '10122345' /*DuoFern-RolloTron pure smart*/ ||
					deviceNumberId == '14236011' /*DuoFern-RolloTron-Pro-Comfort-9800*/ ||
					deviceNumberId == '23602075' /*DuoFern-S-Line-Motor-Typ-SLDM-10/16-PZ*/ ||
					deviceNumberId == '23783076' /*RolloTube S-line Sun DuoFern SLDSM 30/16PZ*/ ||
					deviceNumberId == '23784076' /*RolloTube S-line Sun DuoFern SLDSM 40/16PZ*/ ||
					deviceNumberId == '23782076' /*RolloTube S-line Sun DuoFern SLDSM 50/12PZ*/ ||
					deviceNumberId == '23785076' /*RolloTube S-line Sun DuoFern SLDSM 50/12PZ*/ ||
                    deviceNumberId == '25782075' /*RolloTube S-line Zip DuoFern SLDZS 06/28Z, SLDZS 10/16Z, SLDZM 10/16Z, SLDZM 20/16Z, SLDZM 30/16Z, SLDZM 40/16Z, SLDZM 50/12Z*/ ||
                    deviceNumberId == '10236010' /*DuoFern-Rollladenmotor premium smart m10*/ ||
                    deviceNumberId == '10236020' /*DuoFern-Rollladenmotor premium smart m20*/ ||
                    deviceNumberId == '10236030' /*DuoFern-Rollladenmotor premium smart m30*/ ||
                    deviceNumberId == '10236040' /*DuoFern-Rollladenmotor premium smart m40*/ ||
                    deviceNumberId == '10234010' /*DuoFern-Rollladenmotor premium smart s10*/) {
			if (0 >= parseInt(input)) {
				input = 0;
			} else if (parseInt(input) >= 100) {
				input = 100;
			}

			data = '{"name":"GOTO_POS_CMD", "value":"' + parseInt(input) + '"}';
			
		//role == temperature
		} else if (deviceNumberId == '35003064' /*DuoFern-Heizkörperstellantrieb-9433*/ ||
					deviceNumberId == '35002319' /*Z-Wave-Heizkörperstellantrieb-8433*/ ||
					deviceNumberId == '13601001' /*DuoFern-Heizkörper-Thermostat smart*/) {
			//range 40°C-280°C in 0.5°C steps
			var val = (parseFloat(input)*10);
			
			if (val < 40) {
				val = 40;
			} else if (val > 280) {
				val = 280;
			}
			
			val = (val%5<3 ? (val%5===0 ? val : Math.floor(val/5)*5) : Math.ceil(val/5)*5) / 10;
			
			data = '{"name":"TARGET_TEMPERATURE_CFG", "value":"' + val + '"}';
		//role == temperature
		} else if (deviceNumberId == '32501812' /*DuoFern-Raumthermostat-9485*/ ||
		           deviceNumberId == '13501001' /*Thermostat premium smart-13501001*/) {
			//range 40°C-400°C in 0.5°C steps
			var val = (parseFloat(input)*10);
			
			if (val < 40) {
				val = 40;
			} else if (val > 400) {
				val = 400;
			}
			
			val = (val%5<3 ? (val%5===0 ? val : Math.floor(val/5)*5) : Math.ceil(val/5)*5) / 10;
					
			data = '{"name":"TARGET_TEMPERATURE_CFG", "value":"' + val + '"}';
		// Philips Hue (99999983 || 99999981 || 99999982)
		} else if (deviceNumberId == '99999981' /*Philips-Hue-Weiße-Lampe*/ ||
				   deviceNumberId == '99999982' /*Philips-Hue-Ambiance-Spot*/ ||
				   deviceNumberId == '99999983' /*Philips-Hue-RGB-Lampe*/ ||
                   deviceNumberId == '35144001' /*addZ White + Colour E14 LED*/ ||
                   deviceNumberId == '99999974' /*Innr GUI10 (white ambiance)*/ ||
                   deviceNumberId == '35104001' /*Rademacher addZ GU10*/ ) {
			if (0 >= parseInt(input)) {
				input = 0;
			} else if (parseInt(input) >= 100) {
				input = 100;
			}
			
			data = '{"name":"GOTO_POS_CMD", "value":"' + parseInt(input) + '"}';
		}
	
	// Philips Hue (99999983 || 99999982)
	} else if (id.indexOf('ColorTemperature') !== -1) {
		if (153 >= parseInt(input)) {
			input = 153;
		} else if (parseInt(input) >= 500) {
			input = 500;
		}
			
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"SET_COLOR_TEMP_CMD", "value":"' + parseInt(input) + '"}';
	// Philips Hue (99999983)	
	} else if (id.indexOf('RGB') !== -1) {
		input = '0x' + input; 
		
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		data = '{"name":"SET_RGB_CMD", "value":"' + input + '"}';
	} else if (id.indexOf('Action') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		
		input = input.toUpperCase().trim();
		
		if (deviceNumberId == '99999981' /*Philips-Hue-Weiße-Lampe*/ ||
			deviceNumberId == '99999982' /*Philips-Hue-Ambiance-Spot*/ ||
			deviceNumberId == '99999983' /*Philips-Hue-RGB-Lampe*/ ||
            deviceNumberId == '35144001' /*addZ White + Colour E14 LED*/ ||
            deviceNumberId == '99999974' /*Innr GUI10 (white ambiance)*/ ||
            deviceNumberId == '35104001' /*Rademacher addZ GU10*/ ) {
			if (input == 'AN' || input == 'ON') {			
				data = '{"name":"TURN_ON_CMD"}';
			} else if (input == 'AUS' || input == 'OFF') {			
				data = '{"name":"TURN_OFF_CMD"}';
			} else {
				adapter.log.error( 'Command=' + input + ' is not allowed. Allowed values are AN/ON/AUS/OFF.');
			}
		} else {
			if (input == 'RAUF' || input == 'UP' || input == 'HOCH' || input == 'REIN' || input == 'IN') {			
				data = '{"name":"POS_UP_CMD"}';
			} else if (input == 'RUNTER' || input == 'DOWN' || input == 'RAUS' || input == 'OUT') {			
				data = '{"name":"POS_DOWN_CMD"}';
			} else if (input == 'STOPP' || input == 'STOP') {
				data = '{"name":"STOP_CMD"}';
			} else if (input == 'SCHRITT_RAUF') {
				data = '{"name":"DEC_CMD"}';
			} else if (input == 'SCHRITT_RUNTER') {
				data = '{"name":"INC_CMD"}';
			} else {
				adapter.log.error( 'Command=' + input + ' is not allowed. Allowed values are RAUF/RAUS/REIN/RUNTER/STOPP/SCHRITT_RAUF/SCHRITT_RUNTER.');
			}
		}
		
	} else if (id.indexOf('active') !== -1) {
        if (input == 1) {
            input = true;
        } else {
            input = false;
        }

		data = '{"request_type":"SWITCHSCENE","trigger_event":"SCENE_MODE_CMD","value":' + input + '}';
	} else if (id.indexOf('execute') !== -1) {
		data = '{"request_type":"EXECUTESCENE","trigger_event":"TRIGGER_SCENE_MANUALLY_EVT"}';
	} else {
		adapter.log.warn(id + ' can not be changed.');
	}
	
	if (data !== undefined) {
		request({
			method: calcMethod,
			uri: calcUri,
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			],
			body: data
		  },
		  function (error, response, body) {
			if (error) {
				return adapter.log.error('Change Request Error:' +  error + ', Body: ' + body);
			} else {
				return adapter.log.debug('Change Request OK body:' + body);
			}
		});
	} else {
		adapter.log.warn('Change Request could not be done, because data = undefined.');
	}
}

function readSettings() {
    //check if IP is entered in settings
    if (adapter.config.homepilotip === undefined || adapter.config.homepilotip.length === 0) {
        ip = 'homepilot.local';
        adapter.log.error('No IP adress of Homepilot station set up - "' + ip + '" used');
		//adapter.log.error('Adapter will be stopped');
		stopReadHomepilot();
    } else ip = (adapter.config.homepilotport.length > 0) ? adapter.config.homepilotip + ':' + adapter.config.homepilotport : adapter.config.homepilotip;
		
	//check if sync time is entered in settings
	sync_actuators = (adapter.config.sync_actuators === undefined || adapter.config.sync_actuators.length === 0) ? 4 : parseInt(adapter.config.sync_actuators,10);
	adapter.log.info('Homepilot station and ioBroker synchronize actuators every ' + sync_actuators + 's');
		
	sync_sensors = (adapter.config.sync_sensors === undefined || adapter.config.sync_sensors.length === 0) ? 3 : parseInt(adapter.config.sync_sensors,10);
	adapter.log.info('Homepilot station and ioBroker synchronize sensors every ' + sync_sensors + 's');

	sync_transmitters = (adapter.config.sync_transmitters === undefined || adapter.config.sync_transmitters.length === 0) ? 1 : parseInt(adapter.config.sync_transmitters,10);
	adapter.log.info('Homepilot station and ioBroker synchronize transmitters every ' + sync_transmitters + 's');
	
	sync_scenes = (adapter.config.sync_scenes === undefined || adapter.config.sync_scenes.length === 0) ? 5 : parseInt(adapter.config.sync_scenes,10);
	adapter.log.info('Homepilot station and ioBroker synchronize scenes every ' + sync_scenes + 's');
	
	//check if password is set
	password = adapter.config.password;
	
	if (password === undefined || password === null || password == '') {
		adapter.log.debug('Homepilot password is not set -> request without authentication.');
	} else {
		password = password.trim();
		adapter.log.debug('Homepilot password is set -> request with authentication.');
	}
	
	//check if device isBridge for deactivating readScenes
	isBridge = adapter.config.isBridge;
    adapter.log.debug('Instance will run as Bridge: ' + isBridge);
}

function stopReadHomepilot() {
	if (callMainInterval !== null) {
		clearInterval(callMainInterval);
		adapter.log.debug('callMainInterval cleared');
	}
    adapter.log.error('Adapter will be stopped');
}

async function Measure(stateId, callback) {
	var start = performance.now();
	await callback();
	var end = performance.now();
	adapter.setState(stateId, {
		val: `${end - start} ms`,
		ack: true
	});
}

function main() {
    //adapter.subscribeStates('*'); 
	adapter.subscribeStates('*Position');
	adapter.subscribeStates('*Position_inverted');
	adapter.subscribeStates('*Action');
	adapter.subscribeStates('*active');
	adapter.subscribeStates('*execute');
	adapter.subscribeStates('*ColorTemperature');
	adapter.subscribeStates('*RGB');
	adapter.subscribeStates('*slatposition');
	
	adapter.subscribeStates('*AUTO_MODE_CFG');
	adapter.subscribeStates('*TIME_AUTO_CFG');
	adapter.subscribeStates('*CONTACT_AUTO_CFG');
	adapter.subscribeStates('*SUN_AUTO_CFG');
	adapter.subscribeStates('*DAWN_AUTO_CFG');
	adapter.subscribeStates('*DUSK_AUTO_CFG');
	adapter.subscribeStates('*WIND_AUTO_CFG');
	adapter.subscribeStates('*RAIN_AUTO_CFG');
		
    readSettings();
    adapter.log.debug('Homepilot adapter started...');
	
	if (password !== undefined && password != null && password.length > 0) {
		getPasswordSalt();
	} else {
		password = undefined;
		
		passwordSalt = undefined;
		saltedPassword = undefined;
	}
	
	const mainInterval = 1000; 
    let counter = 0;
    let isRunning = false;

	callMainInterval = setInterval( async function() {
		try{			
			if (isRunning) {				
				return;
			}
			isRunning = true;		
			counter++;	
			await Measure('station.Overall_Sync_Time', async () => {
			    if (sync_sensors > 0) {
                    if (counter % sync_sensors === 0){
                        adapter.log.debug('reading homepilot sensor JSON ...');
                        await Measure('station.Sync_Sensors_Time', async () => {
                            await readSensor('http://' + ip + '/v4/devices?devtype=Sensor');
                        });
                    }
				}
				if (sync_transmitters > 0) {
                    if(counter % sync_transmitters === 0){
                        adapter.log.debug('reading homepilot transmitter JSON ...');
                        await Measure('station.Sync_Transmitters_Time', async () => {
                            await readTransmitter('http://' + ip + '/v4/devices?devtype=Transmitter');
                        });
                    }
				}
				if (sync_scenes > 0) {
                    if (counter % sync_scenes === 0){
                        adapter.log.debug('reading homepilot scenes JSON ...');
                        await Measure('station.Sync_Scenes_Time', async () => {
                            await readScenes('http://' + ip + '/v4/scenes');
                        });
                    }
				}
				if (sync_actuators > 0) {
                    if (counter % sync_actuators === 0){
                        adapter.log.debug('reading homepilot actuator JSON ...');
                        await Measure('station.Sync_Actuators_Time', async () => {
                            await readActuator('http://' + ip + '/v4/devices?devtype=Actuator');
                        });
                    }
				}
			});
			if(counter > 3000){
				counter = 0;
			}
		}
		catch (e) {
			adapter.log.warn('Error during update: ' + e);			
			adapter.log.warn(e.stack);
		}
		finally{
			isRunning = false;
		}
    }, mainInterval);
}

function getPasswordSalt() {
	request({
			method: 'POST',
			uri: 'http://' + ip + '/authentication/password_salt'
		},
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var result;
				try {
					result = JSON.parse(body);
				} catch (e) {
					adapter.log.warn('Parse Error: ' + e);
				}
				if (result) {
					passwordSalt = result.password_salt;
					saltedPassword = CryptoJS.SHA256(passwordSalt + CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex)).toString(CryptoJS.enc.Hex);
					
					const data = JSON.stringify({"password":saltedPassword, "password_salt":passwordSalt});
					
					request({
						method: 'POST',
						uri: 'http://' + ip + '/authentication/login',
						headers: [
							{ 'Content-Type': 'application/json' }
						  ],
						body: data
					  },
					  function (error, response, body) {
							if (!error && response.statusCode == 200) {
								cookie = response.headers['set-cookie'];
								adapter.log.debug('Authentication successfull');
							} else {
								adapter.log.error('Authentication failed' + (error ? error : JSON.stringify(response)));
								stopReadHomepilot();
							}
					  });	
				}
			} else {
				adapter.log.error('Login/get password-salt -> Cannot connect to Homepilot: ' + (error ? error : JSON.stringify(response)));
				stopReadHomepilot();
			}
		}
	);
}

async function readActuator(link) {
    var unreach = false;
	
	//request(link, function(error, response, body) {
		try {
			let response = await asyncRequest({
			method: 'GET',
			uri: link,
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			]
			});
		 	if(response.statusCode == 200) {
				var result;
				try {
					result = JSON.parse(response.body);
					var data = JSON.stringify(result, null, 2);
					adapter.log.debug('Homepilot actuator data: ' + data);
					adapter.setState('Actuator-json', {
						val: data,
						ack: true
					});
				} catch (e) {
					adapter.log.warn('Parse Error: ' + e);
					unreach = true;
				}			
							
				if (result) {												 
					for (var i = 0; i < result.devices.length; i++) {
						createActuatorStates(result.devices[i], 'Actuator');
						writeActuatorStates(result.devices[i], 'Actuator');
					  };
					adapter.setState('station.ip', {
						val: ip,
						ack: true
					});						
					await doAdditional(additionalDeviceSettings, 'Actuator');	
				}
			} else {
				adapter.log.warn('Read actuator -> Cannot connect to Homepilot: ' +  JSON.stringify(response));
				unreach = true;
			}
		}catch(error){
			adapter.log.warn('Read actuator -> Cannot connect to Homepilot: ' +  error);
			unreach = true;
		}
			// Write connection status
			adapter.setState('station.UNREACH', {
				val: unreach,
				ack: true
			});		
	additionalDeviceSettings = [];
	
	adapter.log.debug('finished reading Homepilot actuator data');
}

async function readSensor(link) {
    var unreach = false;
	
    //request(link, function(error, response, body) {
		try {
			let response = await asyncRequest({
			method: 'GET',
			uri: link,
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			]
			});
		 	if(response.statusCode == 200) {
				var result;
				try {
					result = JSON.parse(response.body);
					var data = JSON.stringify(result, null, 2);
					adapter.log.debug('Homepilot sensor data: ' + data);
					adapter.setState('Sensor-json', {
						val: data,
						ack: true
					});
				} catch (e) {
					adapter.log.warn('Parse Error: ' + e);
					unreach = true;
				}

				if (result) {
					for (var i = 0; i < result.meters.length; i++) {
						createSensorStates(result.meters[i], 'Sensor'); 
						writeSensorStates(result.meters[i], 'Sensor'); 
					}
					
					await doAdditional(additionalSensorSettings, 'Sensor');
				}
			} else {
				adapter.log.warn('Read sensors -> Cannot connect to Homepilot: ' + JSON.stringify(response));
				unreach = true;
			}
		}catch (error){
			adapter.log.warn('Read sensors -> Cannot connect to Homepilot: ' + error);
			unreach = true;
		}
			// Write connection status
			adapter.setState('station.UNREACH', {
				val: unreach,
				ack: true
			});

	
	additionalSensorSettings = [];
    adapter.log.debug('Finished reading Homepilot sensor data');
}

async function readTransmitter(link) {
    var unreach = false;	
    //request(link, function(error, response, body) {
		try {
			let response = await asyncRequest({
			method: 'GET',
			uri: link,
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			]
			});
		 	if(response.statusCode == 200) {
				var result;
				try {
					result = JSON.parse(response.body);
					var data = JSON.stringify(result, null, 2);
					adapter.log.debug('Homepilot transmitter data: ' + data);
					adapter.setState('Transmitter-json', {
						val: data,
						ack: true
					});
				} catch (e) {
					adapter.log.warn('Parse Error: ' + e);
					unreach = true;
				}				
				if (result) {
					for (var i = 0; i < result.transmitters.length; i++) {
						createTransmitterStates(result.transmitters[i], 'Transmitter'); 
						writeTransmitterStates(result.transmitters[i], 'Transmitter'); 
					}
					
					await doAdditional(additionalTransmitterSettings, 'Transmitter');	
				}
			} else {
				adapter.log.warn('Transmitter sensors -> Cannot connect to Homepilot: ' +  JSON.stringify(response));
				unreach = true;
			}
		}
			catch(error){
				adapter.log.warn('Transmitter sensors -> Cannot connect to Homepilot: ' +  error);
				unreach = true;
			}
			// Write connection status
			adapter.setState('station.UNREACH', {
				val: unreach,
				ack: true
			});		
	additionalTransmitterSettings = [];
	
    adapter.log.debug('Finished reading Homepilot transmitter data');
}

async function readScenes(link) {
	if (isBridge) {
       return;
    }

    var unreach = false;
	try {
	let response = await asyncRequest({
		method: 'GET',
		uri: link,
		headers: [
			{ 'Cookie': cookie },
			{ 'Content-Type': 'application/json' }
		]
		});
		 if(response.statusCode == 200) {
			var result;
			try {
				result = JSON.parse(response.body);
					var data = JSON.stringify(result, null, 2);
					adapter.log.debug('Homepilot scene data: ' + data);
					adapter.setState('Scene-json', {
						val: data,
						ack: true
					});
				} catch (e) {
					adapter.log.warn('Parse Error: ' + e);
					unreach = true;
				}

				if (result) {
					for (var i = 0; i < result.scenes.length; i++) {
						await createSceneStates(result.scenes[i], 'Scene'); 
						await writeSceneStates(result.scenes[i], 'Scene'); 
					}					
				}
			} else {
				adapter.log.warn('Scenes -> Cannot connect to Homepilot: ' + JSON.stringify(response));
				unreach = true;
			}			
		}catch(error){
			adapter.log.warn('Scenes -> Cannot connect to Homepilot: ' + error);
			unreach = true;
		}	
		// Write connection status
		adapter.setState('station.UNREACH', {
			val: unreach,
			ack: true
		});
    adapter.log.debug('Finished reading Homepilot scene data');
}

function calculatePath(result, type) {
	if (type == 'Scene') {
		var sid = result.sid;
		deviceType = 'Scene';
		deviceRole = 'switch';
		
		path = type + '.' + sid;
		
		return;
	}
	
	var deviceId   = result.did;
	var deviceName = result.name;
	var deviceNumber = deviceNumberNormalize(result.deviceNumber);
	
	path = type + '.' + deviceId + '-' + deviceNumber;
	
	switch (deviceNumber) {
		case "35003064":
            deviceType = 'DuoFern-Heizkörperstellantrieb-9433';
			deviceRole = 'level.temperature';
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
			break;

		case "13601001":
            deviceType = 'DuoFern-Heizkörper-Thermostat smart';
            deviceRole = 'level.temperature';

            if (type == 'Actuator' && !isBridge) {
                //additionalDeviceSettings.push(deviceId);
            }
            break;
			
		case "32501812":
			deviceType = 'DuoFern-Raumthermostat-9485';
			deviceRole = 'level.temperature';
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
            break;

		case "13501001":
            deviceType = 'Thermostat premium smart-13501001';
            deviceRole = 'level.temperature';

            break;

		case "35002319":
			deviceType = 'ZWave-Heizkörperstellantrieb-8433';
			deviceRole = 'level.temperature';
            break;
        
		case "35002414":
            deviceType = 'ZWave-RepeaterMitSchaltfunktion-8434';
			deviceRole = 'switch' ;
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
            break;
			
        case "35000262":
			deviceType = 'DuoFernUniversal-Aktor2-Kanal-9470-2';
			deviceRole = 'switch' ;
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
            break;
		
        case "35001164":
			deviceType = 'DuoFern-Zwischenstecker-Schalten-9472';
			deviceRole = 'switch' ;
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
            break;


        case "35204011":
            deviceType = 'DeltaDore-Zigbee-Stick-Easy Plug F16EM';
            deviceRole = 'switch' ;

            break;

        case "99999960":
            deviceType = 'NoName Zwischenstecker';
            deviceRole = 'switch' ;
            break;

        case "11301001":
            deviceType = 'Zwischenstecker smart-11301001';
            deviceRole = 'switch' ;

            break;
					
		case "32501772":
			deviceType = 'DuoFern-Bewegungsmelder-9484';
			if (type == 'Actuator') {
				deviceRole = 'switch' ;
				additionalDeviceSettings.push(deviceId);
			} else {
				deviceRole = 'text';
				
				if (type == 'Sensor') {
					additionalSensorSettings.push(deviceId);
				}
			}
			
            break;	

		case "32501972":
			deviceType = 'DuoFern-Mehrfachwandtaster-230V-9494-2';
			deviceRole = 'switch';
			if (type == 'Transmitter') {
					additionalTransmitterSettings.push(deviceId);
			}
            break;
			
        case "35000864":
			deviceType = 'DuoFern-Connect-Aktor-9477';
			deviceRole = 'level.blind';
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
            break;
		
		case "14234511":
			deviceType = 'DuoFern-RolloTron-Standard-1400/1405/1440';
			deviceRole = 'level.blind';
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
            break;

       case "10142345":
            deviceType = 'Gurtwickler RolloTron classic smart 10142345';
            deviceRole = 'level.blind';

            break;

        case "10251530":
            deviceType = 'DuoFern-RolloTron pure smart Aufputz Minigurt';
            deviceRole = 'level.blind';

            if (type == 'Actuator' && !isBridge) {
                additionalDeviceSettings.push(deviceId);
            }
            break;

		case "35000662":
			deviceType = 'DuoFernRohrmotor-Aktor';
			deviceRole = 'level.blind';
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
            break;

        case "10941001":
            deviceType = 'DuoFern-Rollladenaktor smart Unterputz';
            deviceRole = 'level.blind';

            break;
			
		case "31500162":
			deviceType = 'DuoFern-Rohrmotorsteuerung';
			deviceRole = 'level.blind';
			break;
		
		case "36500172":
			deviceType = 'DuoFern-Troll-Basis-5615';
			deviceRole = 'level.blind';
			break;
			
		case "27601565":
			deviceType = 'DuoFern-Rohrmotor';
			deviceRole = 'level.blind';
			break;
		
		case "45059071":
			deviceType = 'RolloPort-SX5-DuoFern-RP-SX5DF-900N-3';
			deviceRole = 'level.blind';
			break;
		
		case "36500572":
			deviceType = 'DuoFern-Troll-Comfort-5665';
			deviceRole = 'level.blind';
			break;		
			
		case "32000064":
			deviceType = 'DuoFern-Umweltsensor-9475';
			deviceRole = 'level.blind';
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
			break;	
		
		case "23602075":
			deviceType = 'DuoFern-S-Line-Motor-Typ-SLDM-10/16-PZ';
			deviceRole = 'level.blind';
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
			break;
			
		case "16234511":
			deviceType = 'DuoFern-RolloTron-Comfort-1800/1805/1840';
			if (type == 'Actuator') {
				deviceRole = 'level.blind';
				
				if (!isBridge) {
					additionalDeviceSettings.push(deviceId);
				}
			}
			break;

        case "10182345":
			deviceType = 'DuoFern-RolloTron premium smart';
			deviceRole = 'level.blind';
			break;

		case "10122345":
            deviceType = 'DuoFern-RolloTron pure smart';
            deviceRole = 'level.blind';
            break;

        case "10236010":
            deviceType = 'DuoFern-Rollladenmotor premium smart m10';
            deviceRole = 'level.blind';
            break;

        case "10236020":
            deviceType = 'DuoFern-Rollladenmotor premium smart m20';
            deviceRole = 'level.blind';
            break;

        case "10236030":
            deviceType = 'DuoFern-Rollladenmotor premium smart m30';
            deviceRole = 'level.blind';
            break;

        case "10236040":
            deviceType = 'DuoFern-Rollladenmotor premium smart m40';
            deviceRole = 'level.blind';
            break;

        case "10234010":
            deviceType = 'DuoFern-Rollladenmotor premium smart s10';
            deviceRole = 'level.blind';
            break;

		case "14236011":
			deviceType = 'DuoFern-RolloTron-Pro-Comfort-9800';
			deviceRole = 'level.blind';
			
			if (type == 'Actuator' && !isBridge) {
				additionalDeviceSettings.push(deviceId);
			}
			break;
			
		case "35000462":
			deviceType = 'DuoFern-Universal-Dimmaktor-UP-9476';
			deviceRole = 'level.dimmer';
			break;	
			
		case "35140462":
			deviceType = 'DuoFern-UniversalDimmer-9476';
			deviceRole = 'level.dimmer';
			break;
	
		case "32002119":
			deviceType = 'ZWave-Fenster-Türkontakt-8431';
            break;
			
		case "32003164":
			deviceType = 'DuoFern-Fenster-Türkontakt-9431';
            break;
		
		case "99999998":
		case "99999999":
			deviceType = 'GeoPilot-(Handy)';
            break;
			
		case "32001664":
			deviceType = 'DuoFern-Rauchmelder-9481';
            break;	
			
		case "32000062":
			deviceType = 'DuoFern-Funksender-UP-9497';
            break;	
		
		case "32004329":
			deviceType = 'HD-Kamera-9487-A';
			//additionalSensorSettings.push(deviceId);
            break;
		
		case "32004119":
			deviceType = 'IP-Kamera 9483';
            break;
	
		case "32160211":
            deviceType = 'DuoFern-Wandtaster-9494';
			if (type == 'Transmitter') {
				additionalTransmitterSettings.push(deviceId);
			}
			break;

		case "12501006":
            deviceType = 'Wandtaster-smart-3-Gruppen-12501006';
            //if (type == 'Transmitter') {
            //    additionalTransmitterSettings.push(deviceId);
            //}
            break;

        case "12501001":
            deviceType = 'Wandtaster-smart-1-Gruppe-12501001';
            //if (type == 'Transmitter') {
            //    additionalTransmitterSettings.push(deviceId);
            //}
            break;
	
		case "32501974":
            deviceType = 'DuoFern-Mehrfachwandtaster-BAT-9494-1';
			if (type == 'Transmitter') {
				additionalTransmitterSettings.push(deviceId);
			}
			break;
		
		case "32501973":
            deviceType = 'DuoFern-Wandtaster-1-Kanal-9494-3';
			if (type == 'Transmitter') {
				additionalTransmitterSettings.push(deviceId);
			}
			break;
			
		case "34810060":
            deviceType = 'DuoFern-Handzentrale-9493';
			break;

		case "32480366":
            deviceType = 'DuoFern-Handsender-Standard-9491';
			break;
		
		case "32480361":
			deviceType = 'DuoFern-Handsender-Standard-9491-2';
			break;
  
		case "32000069":
			deviceType = 'DuoFern-Sonnensensor-9478';
			break;

        case "32210069":
			deviceType = 'DuoFern-Sonnensensor-9478-1';
			break;

		case "10771003":
            deviceType = 'Sonnensensor-smart';
            break;
        
        case "32004464":
            deviceType = 'DuoFern Sonnen-/Windsensor 9499';
			break;

		case "10771002":
		    deviceType = 'DuoFern Sonnen-/Windsensor smart mit Solarbetrieb';
        	break;
		
		case "99999980":
			deviceType = 'Philips-Hue-Bridge';
            break;
		
		case "99999981":
			deviceType = 'Philips-Hue-Weiße-Lampe';
            break;

        case "99999974":
            deviceType = 'Innr GUI10 (white ambiance)';
            break;
		
		case "99999982":
			deviceType = 'Philips-Hue-Ambiance-Spot';
            break;
			
		case "99999983":
			deviceType = 'Philips-Hue-RGB-Lampe';
            break;

		case "35104001":
            deviceType = 'Rademacher addZ GU10';
            break;

		case "32004219":
			deviceType = 'HD-Kamera-9486';
            break;

        case "35144001":
			deviceType = 'addZ White + Colour E14 LED';
            break;

        //Versuch ohne zu testen
        case "23783076":
            deviceType = "RolloTube S-line Sun DuoFern SLDSM 30/16PZ";
            deviceRole = 'level.blind';

            if (type == 'Actuator' && !isBridge) {      //???
                additionalDeviceSettings.push(deviceId);
            }
            break;

        //Versuch ohne zu testen
        case "23784076":
            deviceType = "RolloTube S-line Sun DuoFern SLDSM 40/16PZ";
            deviceRole = 'level.blind';

            if (type == 'Actuator' && !isBridge) {      //???
                additionalDeviceSettings.push(deviceId);
            }
            break;

		case "23782076":
		case "23785076":
		    deviceType = "RolloTube S-line Sun DuoFern SLDSM 50/12PZ";
            deviceRole = 'level.blind';

            if (type == 'Actuator' && !isBridge) {      //???
                additionalDeviceSettings.push(deviceId);
            }
		    break;


        case "25782075":
            deviceType = "RolloTube S-line Zip DuoFern SLDZS 06/28Z, SLDZS 10/16Z, SLDZM 10/16Z, SLDZM 20/16Z, SLDZM 30/16Z, SLDZM 40/16Z, SLDZM 50/12Z";
            deviceRole = 'level.blind';
            break;

        default:
            adapter.log.debug('Unknown ' + type + ' deviceNumber=' + deviceNumber +'. For implementation, please contact the developer on GIT repo.');
    }
}

function createCommon(result) {
	var deviceName = result.name;
	var deviceId   = result.did;
		
	// create Channel DeviceID
	adapter.setObjectNotExists(path, {
		type: 'channel',
		common: {
			name: deviceType + ' (Device ID ' + deviceId + ')',
			role: 'text',
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.deviceNumber', {
		type: 'state',
		common: {
			name: 'deviceNumber',
			desc: 'deviceNumber stored in homepilot for device ' + deviceId,
			type: 'string',
			role: 'text',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.deviceGroup', {
		type: 'state',
		common: {
			name: 'deviceGroup',
			desc: 'deviceGroup stored in homepilot for device ' + deviceId,
			type: 'number',
			role: 'value',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.description', {
		type: 'state',
		common: {
			name: 'description',
			desc: 'description stored in homepilot for device ' + deviceId,
			type: 'string',
			role: 'text',
			read: true,
			write: false
		},
		native: {}
	});		

	adapter.setObjectNotExists(path + '.did', {
		type: 'state',
		common: {
			name: 'did',
			desc: 'did stored in homepilot for device ' + deviceId,
			type: 'number',
			role: 'value',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.name', {
		type: 'state',
		common: {
			name: 'name',
			desc: 'name stored in homepilot for device ' + deviceId,
			type: 'string',
			role: 'text',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.statusValid', {
		type: 'state',
		common: {
		   name: 'statusValid',
			desc: 'statusValid stored in homepilot for device ' + deviceId,
			type: 'boolean',
			role: 'text',
			def: true,
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.visible', {
		type: 'state',
		common: {
		   name: 'visible',
			desc: 'visible stored in homepilot for device ' + deviceId,
			type: 'boolean',
			role: 'text',
			def: true,
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.uid', {
		type: 'state',
		common: {
			name: 'uid',
			desc: 'uid stored in homepilot for device ' + deviceId,
			type: 'string',
			role: 'text',
			read: true,
			write: false
		},
		native: {}
	});
}

function createActuatorStates(result, type) {
	calculatePath(result, type);
	
	if (deviceType !== undefined) {
        if (actuatorCreateHashmap.has(result.did)) {
            path = undefined;
	        deviceRole = undefined;	
	        deviceType = undefined;
            return;
        } else {
            actuatorCreateHashmap.set(result.did, result.did);
        }

		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceName = result.name;
		var deviceId   = result.did;
		
		createCommon(result);
		
		adapter.setObjectNotExists(path + '.hasErrors', {
			type: 'state',
			common: {
				name: 'number of errors',
				desc: 'number of errors of device ' + deviceId,
				type: 'number',
				role: 'value',
				min: 0,
				read: true,
				write: false
			},
			native: {}
		});
	
		adapter.setObjectNotExists(path + '.messages', {
			type: 'state',
			common: {
				name: 'messages',
				desc: 'messages stored in homepilot for device ' + deviceId,
				type: 'string',
				role: 'text',
				read: true,
				write: false
			},
			native: {}
		});
	
		if (deviceRole == 'level.blind' || deviceRole == 'level.dimmer') {
			adapter.setObjectNotExists(path + '.Position', {
				type: 'state',
				common: {
					name: 'Position',
					desc: 'Position stored in homepilot for device ' + deviceId,
					type: 'number',
					role: deviceRole,
					min: 0,
					max: 100,
					unit: '%',
					read: true,
					write: true
				},
				native: {}
			});
			
			if (deviceRole == 'level.blind') {
				adapter.setObjectNotExists(path + '.Action', {
					type: 'state',
					common: {
						name: 'RAUF/RAUS/REIN/RUNTER/STOPP/SCHRITT_RAUF/SCHRITT_RUNTER',
						desc: 'RAUF/RAUS/REIN/RUNTER/STOPP/SCHRITT_RAUF/SCHRITT_RUNTER',
						type: 'string',
						role: 'text',
						def: '',
						read: true,
						write: true
					},
					native: {}
				});
				
				adapter.setObjectNotExists(path + '.Position_inverted', {
					type: 'state',
					common: {
						name: 'Position_inverted',
						desc: 'Position_inverted stored in homepilot for device ' + deviceId,
						type: 'number',
						role: deviceRole,
						min: 0,
						max: 100,
						unit: '%',
						read: true,
						write: true
					},
					native: {}
				});
			}
			
			if (deviceNumber == '36500172' ||
			    deviceNumber == '35000662') {
				adapter.setObjectNotExists(path + '.slatposition', {
					type: 'state',
					common: {
						name: 'slatposition',
						desc: 'slatposition stored in homepilot for device ' + deviceId,
						type: 'number',
						role: deviceRole,
						min: 0,
						max: 100,
						unit: '%',
						read: true,
						write: true
					},
					native: {}
				});
			}
		} else if (deviceRole == 'level.temperature') {
			if (deviceNumber == '32501812' ||
			    deviceNumber == '13501001' /*Thermostat premium smart-13501001*/) {
				adapter.setObjectNotExists(path + '.Position', {
					type: 'state',
					common: {
						name: 'Position',
						desc: 'Position stored in homepilot for device ' + deviceId,
						type: 'number',
						role: deviceRole,
						min: 4,
						max: 40,
						unit: '°C',
						read: true,
						write: true
					},
					native: {}
				});
			} else {
				adapter.setObjectNotExists(path + '.Position', {
					type: 'state',
					common: {
						name: 'Position',
						desc: 'Position stored in homepilot for device ' + deviceId,
						type: 'number',
						role: deviceRole,
						min: 4,
						max: 28,
						unit: '°C',
						read: true,
						write: true
					},
					native: {}
				});
			}		
		} else {
			if (deviceNumber != '99999980' /*Philips-Hue-Bridge*/ &&
				deviceNumber != '99999981' /*Philips-Hue-Weiße-Lampe*/ &&
				deviceNumber != '99999982' /*Philips-Hue-Ambiance-Spot*/ &&
				deviceNumber != '99999983' /*Philips-Hue-RGB-Lampe*/ &&
                deviceNumber != '35144001' /*addZ White + Colour E14 LED*/ &&
                deviceNumber != '99999974' /*Innr GUI10 (white ambiance)*/ &&
                deviceNumber != '35104001' /*Rademacher addZ GU10*/ ) {
				adapter.setObjectNotExists(path + '.Position', {
					type: 'state',
					common: {
					   name: 'Position',
						desc: 'Position stored in homepilot for device ' + deviceId,
						type: 'boolean',
						role: deviceRole,
						def: false,
						read: true,
						write: true
					},
					native: {}
				});
			}
		}

	    if (deviceNumber == '35204011' /*DeltaDore-Zigbee-Stick-Easy Plug F16EM*/) {
            adapter.setObjectNotExists(path + '.Voltage', {
                type: 'state',
                common: {
                    name: 'Voltage',
                    desc: 'Voltage stored in homepilot for device ' + deviceId,
                    type: 'number',
                    role: 'value.voltage',
                    unit: 'V',
                    min: 0,
                    read: true,
                    write: false
                },
                native: {}
            });

            adapter.setObjectNotExists(path + '.Current', {
                type: 'state',
                common: {
                    name: 'Current',
                    desc: 'Current stored in homepilot for device ' + deviceId,
                    type: 'number',
                    role: 'value.current',
                    unit: 'A',
                    min: 0,
                    read: true,
                    write: false
                },
                native: {}
            });

            adapter.setObjectNotExists(path + '.Power', {
                type: 'state',
                common: {
                    name: 'Power',
                    desc: 'Power stored in homepilot for device ' + deviceId,
                    type: 'number',
                    role: 'value.power',
                    unit: 'W',
                    min: 0,
                    read: true,
                    write: false
                },
                native: {}
            });

            adapter.setObjectNotExists(path + '.EnergyTotal', {
                type: 'state',
                common: {
                    name: 'EnergyTotal',
                    desc: 'EnergyTotal stored in homepilot for device ' + deviceId,
                    type: 'number',
                    role: 'value.power.consumption',
                    unit: 'kWh',
                    min: 0,
                    max: 100000000000,
                    read: true,
                    write: false
                },
                native: {}
            });
	    }

		if (deviceNumber == '35003064' || deviceNumber == '13601001') {
			adapter.setObjectNotExists(path + '.batteryStatus', {
				type: 'state',
				common: {
					name: 'batteryStatus',
					desc: 'batteryStatus stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					unit: '%',
					min: 0,
					read: true,
					write: false
				},
				native: {}
			});
			
			adapter.setObjectNotExists(path + '.batteryLow', {
				type: 'state',
				common: {
				   name: 'batteryLow',
					desc: 'batteryLow stored in homepilot for device ' + deviceId,
					type: 'boolean',
					role: 'text',
					def: false,
					read: true,
					write: false
				},
				native: {}
			});
			
			adapter.setObjectNotExists(path + '.posMin', {
				type: 'state',
				common: {
					name: 'posMin',
					desc: 'posMin stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					min: 4,
					read: true,
					write: false
				},
				native: {}
			});
			
			adapter.setObjectNotExists(path + '.posMax', {
				type: 'state',
				common: {
					name: 'posMax',
					desc: 'posMax stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					min: 28,
					read: true,
					write: false
				},
				native: {}
			});	
		}
		
		if (deviceNumber == '35003064' ||
			deviceNumber == '32501812' ||
			deviceNumber == '13501001' /*Thermostat premium smart-13501001*/ ||
			deviceNumber == '13601001') {
			adapter.setObjectNotExists(path + '.acttemperatur', {
				type: 'state',
				common: {
					name: 'acttemperatur',
					desc: 'acttemperatur stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					unit: '°C',
					read: true,
					write: false
				},
				native: {}
			});
			
			if (deviceNumber == '32501812' ||
			    deviceNumber == '13501001' /*Thermostat premium smart-13501001*/) {
				adapter.setObjectNotExists(path + '.relaisstatus', {
					type: 'state',
					common: {
						name: 'relaisstatus',
						desc: 'relaisstatus stored in homepilot for device ' + deviceId,
						type: 'number',
						role: 'value',
						read: true,
						write: false
					},
					native: {}
				});
				
				adapter.setObjectNotExists(path + '.automaticvalue', {
					type: 'state',
					common: {
						name: 'automaticvalue',
						desc: 'automaticvalue stored in homepilot for device ' + deviceId,
						type: 'number',
						role: 'value',
						read: true,
						write: false
					},
					native: {}
				});
				
				adapter.setObjectNotExists(path + '.manualoverride', {
					type: 'state',
					common: {
						name: 'manualoverride',
						desc: 'manualoverride stored in homepilot for device ' + deviceId,
						type: 'number',
						role: 'value',
						read: true,
						write: false
					},
					native: {}
				});
			}
		}
		
		if (deviceNumber == '99999981' /*Philips-Hue-Weiße-Lampe*/ ||
			deviceNumber == '99999982' /*Philips-Hue-Ambiance-Spot*/ ||
			deviceNumber == '99999983' /*Philips-Hue-RGB-Lampe*/ ||
            deviceNumber == '35144001' /*addZ White + Colour E14 LED*/ ||
            deviceNumber == '99999974' /*Innr GUI10 (white ambiance)*/ ||
            deviceNumber == '35104001' /*Rademacher addZ GU10*/ ) {
			adapter.setObjectNotExists(path + '.Position', {
				type: 'state',
				common: {
					name: 'Position',
					desc: 'Position stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'level.dimmer',
					min: 0,
					max: 100,
					unit: '%',
					read: true,
					write: true
				},
				native: {}
			});
			
			if (deviceNumber != '99999981' /*Philips-Hue-Weiße-Lampe*/) { 
				adapter.setObjectNotExists(path + '.ColorTemperature', {
					type: 'state',
					common: {
						name: 'ColorTemperature',
						desc: 'ColorTemperature stored in homepilot for device ' + deviceId,
						type: 'number',
						role: 'level.color.temperature',
						min: 153,
						max: 500,
						read: true,
						write: true
					},
					native: {}
				});
				
				if (deviceNumber != '99999982' /*Philips-Hue-Ambiance-Spot*/ &&
				    deviceNumber != '99999974' /*Innr GUI10 (white ambiance)*/ ) {
					adapter.setObjectNotExists(path + '.RGB', {
						type: 'state',
						common: {
							name: 'RGB',
							desc: 'RGB stored in homepilot for device ' + deviceId,
							type: 'string',
							role: 'level.rgb',
							read: true,
							write: true
						},
						native: {}
					});
				}
			}
			
			adapter.setObjectNotExists(path + '.Action', {
				type: 'state',
				common: {
					name: 'AN/AUS/ON/OFF',
					desc: 'AN/AUS/ON/OFF',
					type: 'string',
					role: 'text',
					def: '',
					read: true,
					write: true
				},
				native: {}
			});
		}
	}
	
	path = undefined;
	deviceRole = undefined;	
	deviceType = undefined;
}

function createSensorStates(result, type) {
	calculatePath(result, type);
	
	if (deviceType !== undefined) {
        if (sensorCreateHashmap.has(result.did)) {
            path = undefined;
	        deviceRole = undefined;	
	        deviceType = undefined;
            
            return;
        } else {
            sensorCreateHashmap.set(result.did, result.did);
        }

		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceName = result.name;
		var deviceId   = result.did;
		
		createCommon(result);
		
		adapter.setObjectNotExists(path + '.timestamp', {
			type: 'state',
			common: {
				name: 'timestamp',
				desc: 'timestamp stored in homepilot for device ' + deviceId,
				type: 'number',
				role: 'value',
				min: -1,
				read: true,
				write: false,
				def: 0
			},
			native: {}
		});
		
		if (deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
			adapter.setObjectNotExists(path + '.smoke_detected', {
				type: 'state',
				common: {
				   name: 'smoke_detected',
					desc: 'smoke_detected stored in homepilot for device ' + deviceId,
					type: 'boolean',
					role: 'text',
					def: true,
					read: true,
					write: false
				},
				native: {}
			});
		}
		
		if (deviceNumber == '32501772' /*DuoFern-Bewegungsmelder-9484*/ ||
			deviceNumber == '32004329' /*HD-Kamera-9487-A*/ ||
			deviceNumber == '32004119' /*IP-Kamera 9483*/ ||
			deviceNumber == '32004219' /*HD-Kamera-9486*/) {
			adapter.setObjectNotExists(path + '.movement_detected', {
				type: 'state',
				common: {
				   name: 'movement_detected',
					desc: 'movement_detected stored in homepilot for device ' + deviceId,
					type: 'boolean',
					role: 'text',
					def: true,
					read: true,
					write: false
				},
				native: {}
			});
		}
		
		if (deviceNumber == '32000064' /*DuoFern-Umweltsensor*/) {
			adapter.setObjectNotExists(path + '.sun_brightness', {
				type: 'state',
				common: {
					name: 'sun_brightness',
					desc: 'sun_brightness stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					read: true,
					write: false
				},
				native: {}
			});
			
			adapter.setObjectNotExists(path + '.sun_direction', {
				type: 'state',
				common: {
					name: 'sun_direction',
					desc: 'sun_direction stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					read: true,
					write: false
				},
				native: {}
			});
			
			adapter.setObjectNotExists(path + '.sun_elevation', {
				type: 'state',
				common: {
					name: 'sun_elevation',
					desc: 'sun_elevation stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					read: true,
					write: false
				},
				native: {}
			});
			
			adapter.setObjectNotExists(path + '.wind_speed', {
				type: 'state',
				common: {
					name: 'wind_speed',
					desc: 'wind_speed stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					read: true,
					write: false
				},
				native: {}
			});
			
			adapter.setObjectNotExists(path + '.rain_detected', {
				type: 'state',
				common: {
				   name: 'rain_detected',
					desc: 'rain_detected stored in homepilot for device ' + deviceId,
					type: 'boolean',
					role: 'text',
					def: true,
					read: true,
					write: false
				},
				native: {}
			});
		}
		
		if (deviceNumber == '99999998' /*GeoPilot (Handy)*/ ||
			deviceNumber == '99999999' /*GeoPilot (Handy)*/) {
			adapter.setObjectNotExists(path + '.area_entered', {
				type: 'state',
				common: {
				   name: 'area_entered',
					desc: 'area_entered stored in homepilot for device ' + deviceId,
					type: 'boolean',
					role: 'text',
					def: true,
					read: true,
					write: false
				},
				native: {}
			});
		}
		
		if (deviceNumber == '36500572' /*Duofern-Troll-Comfort-5665*/ ||
			deviceNumber == '32000064' /*DuoFern-Umweltsensor*/ ||
			deviceNumber == '32000069' /*DuoFern-Sonnensensor-9478*/ ||
            deviceNumber == '32210069' /*DuoFern-Sonnensensor-9478-1*/ ||
            deviceNumber == '10771003' /*Sonnensensor-smart*/ ||
            deviceNumber == '32004464' /*DuoFern Sonnen-/Windsensor 9499*/ ||
            deviceNumber == '10771002' /*DuoFern Sonnen-/Windsensor smart mit Solarbetrieb*/ ||
			deviceNumber == '16234511' /*DuoFern-RolloTron-Comfort-1800/1805/1840*/) {
			adapter.setObjectNotExists(path + '.sun_detected', {
				type: 'state',
				common: {
				   name: 'sun_detected',
					desc: 'sun_detected stored in homepilot for device ' + deviceId,
					type: 'boolean',
					role: 'text',
					def: true,
					read: true,
					write: false
				},
				native: {}
			});
		}

		if (deviceNumber == '32004464' /*DuoFern Sonnen-/Windsensor 9499*/ ||
		    deviceNumber == '10771002' /*DuoFern Sonnen-/Windsensor smart mit Solarbetrieb*/) {
		    adapter.setObjectNotExists(path + '.wind_detected', {
                type: 'state',
                common: {
                   name: 'wind_detected',
                    desc: 'wind_detected stored in homepilot for device ' + deviceId,
                    type: 'boolean',
                    role: 'text',
                    def: true,
                    read: true,
                    write: false
                },
                native: {}
            });
		}

        if (deviceNumber == '32210069' /*DuoFern-Sonnensensor-9478-1*/ ||
            deviceNumber == '10771003' /*Sonnensensor-smart*/) {
            adapter.setObjectNotExists(path + '.vibration_detected', {
				type: 'state',
				common: {
				   name: 'vibration_detected',
					desc: 'vibration_detected stored in homepilot for device ' + deviceId,
					type: 'boolean',
					role: 'text',
					def: true,
					read: true,
					write: false
				},
				native: {}
			});
        }
		
		if (deviceNumber == '32501812' /*DuoFern-Raumthermostat*/ ||
			deviceNumber == '32000064' /*DuoFern-Umweltsensor*/ ||
			deviceNumber == '13501001' /*Thermostat premium smart-13501001*/) {
			adapter.setObjectNotExists(path + '.temperature_primary', {
				type: 'state',
				common: {
					name: 'temperature_primary',
					desc: 'temperature_primary stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					unit: '°C',
					read: true,
					write: false
				},
				native: {}
			});
		}
		
		if (deviceNumber == '32501812' /*DuoFern-Raumthermostat*/ ||
		    deviceNumber == '13501001' /*Thermostat premium smart-13501001*/) {
			adapter.setObjectNotExists(path + '.temperature_target', {
				type: 'state',
				common: {
					name: 'temperature_target',
					desc: 'temperature_target stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					unit: '°C',
					read: true,
					write: false
				},
				native: {}
			});
		} 
		
		if (deviceNumber == '32002119' /*Z-Wave-FensterTürkontakt*/ ||
			deviceNumber == '32003164' /*DuoFern-FensterTürkontakt-9431*/ ||
			deviceNumber == '32000062' /*DuoFern-Funksender-UP-9497*/ ||
			deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
			
			if (deviceNumber != '32001664' /*DuoFern-Rauchmelder-9481*/) {
				adapter.setObjectNotExists(path + '.contact_state', {
					type: 'state',
					common: {
						name: 'contact_state',
						desc: 'contact_state stored in homepilot for device ' + deviceId,
						type: 'string',
						role: 'text',
						read: true,
						write: false
					},
					native: {}
				});
			}
			
			if (deviceNumber != '32000062' /*DuoFern-Funksender-UP-9497*/) {
				adapter.setObjectNotExists(path + '.batteryStatus', {
					type: 'state',
					common: {
						name: 'batteryStatus',
						desc: 'batteryStatus stored in homepilot for device ' + deviceId,
						type: 'number',
						role: 'value',
						unit: '%',
						read: true,
						write: false
					},
					native: {}
				});
			}
			
			if (deviceNumber == '32003164' /*DuoFern-FensterTürkontakt-9431*/ ||
				deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
				adapter.setObjectNotExists(path + '.batteryLow', {
					type: 'state',
					common: {
					   name: 'batteryLow',
						desc: 'batteryLow stored in homepilot for device ' + deviceId,
						type: 'boolean',
						role: 'text',
						def: true,
						read: true,
						write: false
					},
					native: {}
				});
			}
		}	
	}
	
	path = undefined;
	deviceRole = undefined;	
	deviceType = undefined;
}

function createTransmitterStates(result, type) {
	calculatePath(result, type);

	if (deviceType !== undefined) {
        if (transmitterCreateHashmap.has(result.did)) {
            path = undefined;
	        deviceRole = undefined;	
	        deviceType = undefined;
            
            return;
        } else {
            transmitterCreateHashmap.set(result.did, result.did);
        }

		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceName = result.name;
		var deviceId   = result.did;
		
		createCommon(result);

		if (deviceNumber == '32160211' /*DuoFern-Wandtaster-9494*/ ||
		    deviceNumber == '12501006' /*Wandtaster-smart-3-Gruppen-12501006*/ ||
		    deviceNumber == '12501001' /*Wandtaster-smart-1-Gruppe-12501001*/ ||
			deviceNumber == '32501974' /*DuoFern-Mehrfachwandtaster-BAT-9494-1*/ ||
			deviceNumber == '34810060' /*DuoFern-Handzentrale-9493*/ ||
			deviceNumber == '32480366' /*DuoFern-Handsender-Standard-9491*/ ||
			deviceNumber == '32480361' /*DuoFern-Handsender-Standard-9491-2*/ ||
			deviceNumber == '32501973' /*DuoFern-Wandtaster-1-Kanal-9494-3*/) {
				adapter.setObjectNotExists(path + '.batteryLow', {
					type: 'state',
					common: {
					   name: 'batteryLow',
						desc: 'batteryLow stored in homepilot for device ' + deviceId,
						type: 'boolean',
						role: 'text',
						def: true,
						read: true,
						write: false
					},
					native: {}
				});
		}	
		if (deviceNumber == '32160211' /*DuoFern-Wandtaster-9494*/ ||
			deviceNumber == '32501972' /*DuoFern-Mehrfachwandtaster*/		||
		    deviceNumber == '12501006' /*Wandtaster-smart-3-Gruppen-12501006*/ ||
		    deviceNumber == '12501001' /*Wandtaster-smart-1-Gruppe-12501001*/ ||
			deviceNumber == '32501974' /*DuoFern-Mehrfachwandtaster-BAT-9494-1*/ ||
			deviceNumber == '34810060' /*DuoFern-Handzentrale-9493*/ ||
			deviceNumber == '32480366' /*DuoFern-Handsender-Standard-9491*/ ||
			deviceNumber == '32480361' /*DuoFern-Handsender-Standard-9491-2*/ ||
			deviceNumber == '32501973' /*DuoFern-Wandtaster-1-Kanal-9494-3*/) {
				adapter.setObjectNotExists(path + '.Attribute.AutomaticRefreshAttributes', {
					type: 'state',
					common: {
					   name: 'RefreshAttributes',
						desc: 'Refresh the attributes, if transmiiters are polled for  ' + deviceId,
						type: 'boolean',
						role: 'text',
						def: true,
						read: true,
						write: false
					},
					native: {}
				});
		}	
	}
	
	path = undefined;
	deviceRole = undefined;	
	deviceType = undefined;
}

function createSceneStates(result, type) {
	calculatePath(result, type);

	if (deviceType !== undefined) {
        if (sceneCreateHashmap.has(result.sid)) {
            path = undefined;
	        deviceRole = undefined;	
	        deviceType = undefined;
            
            return;
        } else {
            sceneCreateHashmap.set(result.sid, result.sid);
        }

		var sid   = result.sid;
		
		// create Channel DeviceID
		adapter.setObjectNotExists(path, {
			type: 'channel',
			common: {
				name: result.name.substr(0, 25),
				role: 'text',
			},
			native: {}
		});
		
		adapter.setObjectNotExists(path + '.description', {
			type: 'state',
			common: {
				name: 'description',
				desc: 'description stored in homepilot for scene ' + sid,
				type: 'string',
				role: 'text',
				read: true,
				write: false
			},
			native: {}
		});

		adapter.setObjectNotExists(path + '.active', {
			type: 'state',
			common: {
			   name: 'active',
				desc: 'active stored in homepilot for scene ' + sid,
				type: 'number',
				role: deviceRole,
				def: 0,
				read: true,
				write: true
			},
			native: {}
		});
		
		adapter.setObjectNotExists(path + '.isExecutable', {
			type: 'state',
			common: {
			   name: 'isExecutable',
				desc: 'isExecutable stored in homepilot for scene ' + sid,
				type: 'number',
				role: 'text',
				def: 0,
				read: true,
				write: false
			},
			native: {}
		});
		
		adapter.setObjectNotExists(path + '.name', {
			type: 'state',
			common: {
				name: 'name',
				desc: 'name stored in homepilot for scene ' + sid,
				type: 'string',
				role: 'text',
				read: true,
				write: false
			},
			native: {}
		});
		
		adapter.setObjectNotExists(path + '.execute', {
			type: 'state',
			common: {
			   name: 'execute',
				desc: 'execute stored in homepilot for scene ' + sid,
				type: 'boolean',
				role: 'button',
				def: false,
				read: true,
				write: true
			},
			native: {}
		});
	}
	
	path = undefined;
	deviceRole = undefined;	
	deviceType = undefined;
}

function writeCommon(result, type) {

    setCorrectState(path, '.deviceNumber', result.deviceNumber, result.did + '-' + type);
    setCorrectState(path, '.deviceGroup', result.deviceGroup, result.did + '-' + type);
	setCorrectState(path, '.description', result.description, result.did + '-' + type);
	setCorrectState(path, '.did', result.did, result.did + '-' + type);
    setCorrectState(path, '.name', result.name, result.did + '-' + type);
	setCorrectState(path, '.statusValid', result.statusValid, result.did + '-' + type);
    setCorrectState(path, '.visible', result.visible, result.did + '-' + type);
    setCorrectState(path, '.uid', result.uid, result.did + '-' + type);
}

function writeActuatorStates(result, type) {
	calculatePath(result, type);
	
	//if (deviceRole !== undefined) {	
	if (deviceType !== undefined) {
		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceId   = result.did;
		
		writeCommon(result, type);

		setCorrectState(path, '.hasErrors', result.hasErrors, result.did + '-' + type);

		if (result.hasErrors > 0) {
			adapter.log.info('Homepilot Device ' + deviceId + ' reports ' + result.hasErrors + ' error: ' + JSON.stringify(result.messages)); 

			setCorrectState(path, '.messages', JSON.stringify(result.messages), result.did + '-' + type);
		} else {
		    setCorrectState(path, '.messages', '', result.did + '-' + type);
		}
				
		var value = result.statusesMap.Position;
		
		if (deviceRole == 'light.switch' || deviceRole == 'switch') {
			value = (result.statusesMap.Position == '100');
		} else if (deviceRole == 'level.temperature') {
			value = value / 10;
		}
		
		if (deviceNumber != '99999980' /*Philips-Hue-Bridge*/ &&
			deviceNumber != '99999981' /*Philips-Hue-Weiße-Lampe*/ &&
			deviceNumber != '99999982' /*Philips-Hue-Ambiance-Spot*/ &&
			deviceNumber != '99999983' /*Philips-Hue-RGB-Lampe*/ &&
            deviceNumber != '35144001' /*addZ White + Colour E14 LED*/ &&
            deviceNumber != '99999974' /*Innr GUI10 (white ambiance)*/ &&
            deviceNumber != '35104001' /*Rademacher addZ GU10*/ ) {
			setCorrectState(path, '.Position', value, result.did + '-' + type);
		}
		
		if (deviceRole == 'level.blind') {
		    setCorrectState(path, '.Position_inverted', (100 -value), result.did + '-' + type);
		}
		
		if (deviceNumber == '36500172' ||
		    deviceNumber == '35000662') {
		    setCorrectState(path, '.slatposition', result.statusesMap.slatposition, result.did + '-' + type);
		}
		
		if (deviceNumber == '35003064' || deviceNumber == '13601001') {
		    setCorrectState(path, '.batteryStatus', result.batteryStatus, result.did + '-' + type);
			setCorrectState(path, '.batteryLow', result.batteryLow, result.did + '-' + type);
			setCorrectState(path, '.posMin', result.posMin / 10, result.did + '-' + type);
			setCorrectState(path, '.posMax', result.posMax / 10, result.did + '-' + type);
		}

		if (deviceNumber == '35204011' /*DeltaDore-Zigbee-Stick-Easy Plug F16EM*/) {
		    setCorrectState(path, '.Voltage', result.statusesMap.voltage, result.did + '-' + type);
		    setCorrectState(path, '.Current', result.statusesMap.current, result.did + '-' + type);
		    setCorrectState(path, '.Power', result.statusesMap.power, result.did + '-' + type);
		    setCorrectState(path, '.EnergyTotal', result.statusesMap.cumulatedpower, result.did + '-' + type);
		}
	
		if (deviceNumber == '35003064' ||
			deviceNumber == '32501812' ||
			deviceNumber == '13501001' /*Thermostat premium smart-13501001*/ ||
			deviceNumber == '13601001') {
			setCorrectState(path, '.acttemperatur', result.statusesMap.acttemperatur / 10, result.did + '-' + type);
			
			if (deviceNumber == '32501812' ||
			    deviceNumber == '13501001' /*Thermostat premium smart-13501001*/) {
			    setCorrectState(path, '.relaisstatus', result.statusesMap.relaisstatus, result.did + '-' + type);
				setCorrectState(path, '.automaticvalue', result.statusesMap.automaticvalue, result.did + '-' + type);
				setCorrectState(path, '.manualoverride', result.statusesMap.manualoverride, result.did + '-' + type);
			}
		}
		
		if (deviceNumber == '99999981' /*Philips-Hue-Weiße-Lampe*/ ||
			deviceNumber == '99999982' /*Philips-Hue-Ambiance-Spot*/ ||
			deviceNumber == '99999983' /*Philips-Hue-RGB-Lampe*/ ||
            deviceNumber == '35144001' /*addZ White + Colour E14 LED*/ ||
            deviceNumber == '99999974' /*Innr GUI10 (white ambiance)*/ ||
            deviceNumber == '35104001' /*Rademacher addZ GU10*/ ) {
			setCorrectState(path, '.Position', result.statusesMap.Position, result.did + '-' + type);
			
			if (deviceNumber != '99999981' /*Philips-Hue-RGB-Lampe*/) {
			    setCorrectState(path, '.ColorTemperature', result.statusesMap.colortemperature, result.did + '-' + type);

				if (deviceNumber != '99999982' /*Philips-Hue-Ambiance-Spot*/ &&
				    deviceNumber != '99999974' /*Innr GUI10 (white ambiance)*/ ) {
					var rgbValue = result.statusesMap.rgb;
					rgbValue = rgbValue.startsWith('0x') ? rgbValue.substring(2, rgbValue.length) : rgbValue;

					setCorrectState(path, '.RGB', rgbValue, result.did + '-' + type);
				}
			}
		} 
		
		adapter.log.debug(type + ' states for ' + deviceId + ' written');
	}
	
	path = undefined;
	deviceRole = undefined;
	deviceType = undefined;
}

function writeSensorStates(result, type) {
	calculatePath(result, type);
		
	if (deviceType !== undefined) {
		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceId   = result.did;
		
		writeCommon(result, type);

        setCorrectState(path, '.timestamp', result.timestamp, result.did + '-' + type);

		if (deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
		    setCorrectState(path, '.smoke_detected', result.readings.smoke_detected, result.did + '-' + type);
		}
		
		if (deviceNumber == '32501772' /*DuoFern-Bewegungsmelder-9484*/ ||
			deviceNumber == '32004329' /*HD-Kamera-9487-A*/ ||
			deviceNumber == '32004119' /*IP-Kamera 9483*/ ||
			deviceNumber == '32004219' /*HD-Kamera-9486*/) {
			setCorrectState(path, '.movement_detected', result.readings.movement_detected, result.did + '-' + type);
		}
		
		if (deviceNumber == '32000064' /*DuoFern-Umweltsensor*/) {
		    setCorrectState(path, '.sun_brightness', result.readings.sun_brightness, result.did + '-' + type);
			setCorrectState(path, '.sun_direction', result.readings.sun_direction, result.did + '-' + type);
			setCorrectState(path, '.sun_elevation', result.readings.sun_elevation, result.did + '-' + type);
			setCorrectState(path, '.wind_speed', result.readings.wind_speed, result.did + '-' + type);
			setCorrectState(path, '.rain_detected', result.readings.rain_detected, result.did + '-' + type);
		}
		
		if (deviceNumber == '99999998' /*GeoPilot (Handy)*/ ||
			deviceNumber == '99999999' /*GeoPilot (Handy)*/) {
			setCorrectState(path, '.area_entered', result.readings.area_entered, result.did + '-' + type);
		}
		
		if (deviceNumber == '36500572' /*Duofern-Troll-Comfort-5665*/ ||
			deviceNumber == '32000064' /*DuoFern-Umweltsensor*/ ||
			deviceNumber == '32000069' /*DuoFern-Sonnensensor-9478*/ ||
            deviceNumber == '32210069' /*DuoFern-Sonnensensor-9478-1*/ ||
            deviceNumber == '10771003' /*Sonnensensor-smart*/ ||
            deviceNumber == '32004464' /*DuoFern Sonnen-/Windsensor 9499*/ ||
            deviceNumber == '10771002' /*DuoFern Sonnen-/Windsensor smart mit Solarbetrieb*/ ||
			deviceNumber == '16234511' /*DuoFern-RolloTron-Comfort-1800/1805/1840*/) {
			setCorrectState(path, '.sun_detected', result.readings.sun_detected, result.did + '-' + type);
		}

		if (deviceNumber == '32004464' /*DuoFern Sonnen-/Windsensor 9499*/ ||
		     deviceNumber == '10771002' /*DuoFern Sonnen-/Windsensor smart mit Solarbetrieb*/) {
		    setCorrectState(path, '.wind_detected', result.readings.wind_detected, result.did + '-' + type);
		}

        if (deviceNumber == '32210069' /*DuoFern-Sonnensensor-9478-1*/ ||
            deviceNumber == '10771003' /*Sonnensensor-smart*/) {
            setCorrectState(path, '.vibration_detected', result.readings.vibration_detected, result.did + '-' + type); 
        }
		
		if (deviceNumber == '32501812' /*DuoFern-Raumthermostat*/ ||
		    deviceNumber == '13501001' /*Thermostat premium smart-13501001*/ ||
			deviceNumber == '32000064' /*DuoFern-Umweltsensor*/) {
			setCorrectState(path, '.temperature_primary', result.readings.temperature_primary, result.did + '-' + type);
		}
		
		if (deviceNumber == '32501812' /*DuoFern-Raumthermostat*/ ||
		    deviceNumber == '13501001' /*Thermostat premium smart-13501001*/) {
		    setCorrectState(path, '.temperature_target', result.readings.temperature_target, result.did + '-' + type);
		} 
		
		if (deviceNumber == '32002119' /*Z-Wave-FensterTürkontakt*/ ||
			deviceNumber == '32003164' /*DuoFern-FensterTürkontakt-9431*/ ||
			deviceNumber == '32000062' /*DuoFern-Funksender-UP-9497*/ ||
			deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
			
			if (deviceNumber != '32001664' /*DuoFern-Rauchmelder-9481*/) {
			    setCorrectState(path, '.contact_state', result.readings.contact_state, result.did + '-' + type);
			}
			
			if (deviceNumber != '32000062' /*DuoFern-Funksender-UP-9497*/) {
			    setCorrectState(path, '.batteryStatus', result.batteryStatus, result.did + '-' + type);
			}
			
			if (deviceNumber == '32003164' /*DuoFern-FensterTürkontakt-9431*/ ||
				deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
				setCorrectState(path, '.batteryLow', result.batteryLow, result.did + '-' + type);
			}
		}
		
		adapter.log.debug(type + ' states for ' + deviceId + ' written');
	}
	
	path = undefined;
	deviceType = undefined;
	deviceRole = undefined;
}

function writeTransmitterStates(result, type) {
	calculatePath(result, type);
		
	if (deviceType !== undefined) {
        var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceId   = result.did;
		
		writeCommon(result, type);

		if (deviceNumber == '32160211' /*DuoFern-Wandtaster-9494*/ ||
		    deviceNumber == '12501006' /*Wandtaster-smart-3-Gruppen-12501006*/ ||
            deviceNumber == '12501001' /*Wandtaster-smart-1-Gruppe-12501001*/ ||
			deviceNumber == '32501974' /*DuoFern-Mehrfachwandtaster-BAT-9494-1*/ ||
			deviceNumber == '34810060' /*DuoFern-Handzentrale-9493*/ ||
			deviceNumber == '32480366' /*DuoFern-Handsender-Standard-9491*/ ||
			deviceNumber == '32480361' /*DuoFern-Handsender-Standard-9491-2*/ ||
			deviceNumber == '32501973' /*DuoFern-Wandtaster-1-Kanal-9494-3*/) {
			    setCorrectState(path, '.batteryLow', result.batteryLow, result.did + '-' + type);
		}
		
		adapter.log.debug(type + ' states for ' + deviceId + ' written');
	}
	
	path = undefined;
	deviceType = undefined;
	deviceRole = undefined;
}

function writeSceneStates(result, type) {
	calculatePath(result, type);
		
	if (deviceType !== undefined) {
		var sid   = result.sid;

		setCorrectState(path, '.description', result.description, sid + '-' + type);
		setCorrectState(path, '.active', result.active, sid + '-' + type);
		setCorrectState(path, '.isExecutable', result.isExecutable, sid + '-' + type);
		setCorrectState(path, '.name', result.name, sid + '-' + type);
	}
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
  }

const MAX_CONCURRENT = 2;
let runningPromises = 0;
const queue = [];

async function limitedGetSpecificAdditional(element) {
  if (runningPromises >= MAX_CONCURRENT) {
    await new Promise(resolve => queue.push(resolve));
  }
  runningPromises++;
  try {
	await delay(10);
    return await getSpecificAdditional(element);
  } finally {
    runningPromises--;
    if (queue.length > 0) {
      queue.shift()();
    }
  }
}

async function getSpecificAdditional(element) {
	var response = await asyncRequest({
		method: 'GET',
		uri: 'http://' + ip + '/devices/' + element,
		headers: [
			{ 'Cookie': cookie },
			{ 'Content-Type': 'application/json' }
		]
	});		
	if (response.statusCode == 200) {
		return JSON.parse(response.body).payload.device;
	}
}

async function doAdditional(toDoList, type) {
	var unreach = false;
	try {
		toDoList = unique(toDoList);					
		var response = await asyncRequest({
			method: 'GET',
			uri: 'http://' + ip + '/devices',
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			]
		});		
		if (response.statusCode == 200) {
			var result;
			try {				
				result = JSON.parse(response.body);				
			} catch (e) {
				adapter.log.warn('Parse Error: ' + e);
				unreach = true;
			}
			if (result) {
				var elementsToWork = [];
				for (var i = 0; i< result.payload.devices.length ; i++) {					
					var elementJSON = result.payload.devices[i];					
					var element = (elementJSON.capabilities.filter((x)=>x.name === "ID_DEVICE_LOC"))[0].value;						
					if(element && toDoList.includes(Number(element))){											
						elementsToWork.push({elementJSON : elementJSON, element : element});
					}
				}
				for (let index = 0; index < elementsToWork.length; index+=20) {			
					let batch = elementsToWork.slice(index, index + 20);
					await Promise.all(batch.map(async (item) => {	
						try{
							var elementJSON = item.elementJSON;
							var element = item.element;
							var deviceHelper = (elementJSON.capabilities.filter((x)=>x.name === "PROD_CODE_DEVICE_LOC"))[0].value;
							var deviceNumberId = deviceNumberNormalize(deviceHelper);
							var hashMapName = element + '-' + type;
							
							switch(deviceNumberId) {
								case "35003064": /*DuoFern-Heizkörperstellantrieb-9433*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "CONTACT_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'CONTACT_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Schließkontakt', true, hashMapName);
									break;

								case "35000262": /*DuoFernUniversal-Aktor2-Kanal-9470-2*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									break;
									
								case "14234511": /*DuoFern-RolloTronStandard*/
								case "10251530": /*DuoFern-RolloTron pure smart Aufputz Minigurt*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									break;

								case "14236011": /*DuoFern-RolloTron-Pro-Comfort-9800*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									break;	
									
								case "35000864": /*DuoFern-Connect-Aktor-9477*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "WIND_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'WIND_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Wind', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "RAIN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'RAIN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Regen', true, hashMapName);
									break;

								case "32000064": /*DuoFern-Umweltsensor-9475*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "WIND_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'WIND_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Wind', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "RAIN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'RAIN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Regen', true, hashMapName);
									break;
									
								case "32501812": /*DuoFern-Raumthermostat-9485*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									break;	
									
								case "35001164": /*DuoFern-Zwischenstecker-Schalten-9472*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									break;

								case "32501772": /*DuoFern-Bewegungsmelder-9484*/
									if (type == 'Actuator') {
										var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
										doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);

										var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
										doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);

										var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
										doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);

										var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
										doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);

										var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
										doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									} else  if (type == 'Sensor') {
									    var value;

									    var searchElement = elementJSON.capabilities.filter((x)=>x.name === "ON_DURATION_CFG");
									    if (searchElement) {
									        value = (searchElement)[0].value;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'ON_DURATION_CFG.value', value, 'text', 'value', false, "string", hashMapName);

                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'ON_DURATION_CFG.timestamp', value, 'value.datetime', 'timestamp', false, "number", hashMapName);
									    }

										searchElement = elementJSON.capabilities.filter((x)=>x.name === "BUTTON_MODE_CFG");
										if (searchElement) {
                                            value = (searchElement)[0].value;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'BUTTON_MODE_CFG.value', value, 'text', 'value', false, "string", hashMapName);

                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'BUTTON_MODE_CFG.timestamp', value, 'value.datetime', 'timestamp', false, "number", hashMapName);
                                        }

                                        searchElement = elementJSON.capabilities.filter((x)=>x.name === "SENSOR_SENSITIVITY_CFG");
                                        if (searchElement) {
                                            value = (searchElement)[0].value;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SENSOR_SENSITIVITY_CFG.value', value, 'text', 'value', false, "string", hashMapName);

                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SENSOR_SENSITIVITY_CFG.timestamp', value, 'value.datetime', 'timestamp', false, "number", hashMapName);
                                        }

                                        searchElement = elementJSON.capabilities.filter((x)=>x.name === "MOVE_STOP_EVT");
                                        if (searchElement) {
                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'MOVE_STOP_EVT', value, 'value.datetime', 'timestamp', false, "number", hashMapName);

                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'MOVE_START_EVT', value, 'value.datetime', 'timestamp', false, "number", hashMapName);
                                        }

                                        searchElement = elementJSON.capabilities.filter((x)=>x.name === "LIGHT_VAL_LUX_MEA");
                                        if (searchElement) {
                                            value = (searchElement)[0].value;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'LIGHT_VAL_LUX_MEA.value', value, 'text', 'value', false, "string", hashMapName);

                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'LIGHT_VAL_LUX_MEA.timestamp', value, 'value.datetime', 'timestamp', false, "number", hashMapName);
                                        }

                                        searchElement = elementJSON.capabilities.filter((x)=>x.name === "LED_BEHAV_MODE_CFG");
                                        if (searchElement) {
                                            value = (searchElement)[0].value;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'LED_BEHAV_MODE_CFG.value', value, 'text', 'value', false, "string", hashMapName);

                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'LED_BEHAV_MODE_CFG.timestamp', value, 'value.datetime', 'timestamp', false, "number", hashMapName);
                                        }

                                        searchElement = elementJSON.capabilities.filter((x)=>x.name === "CURR_BRIGHTN_CFG");
                                        if (searchElement) {
                                            value = (searchElement)[0].value;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'CURR_BRIGHTN_CFG.value', value, 'text', 'value', false, "string", hashMapName);

                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'CURR_BRIGHTN_CFG.timestamp', value, 'value.datetime', 'timestamp', false, "number", hashMapName);
                                        }

                                        searchElement = elementJSON.capabilities.filter((x)=>x.name === "MOTION_DETECTION_MEA");
                                        if (searchElement) {
                                            value = (searchElement)[0].value;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'MOTION_DETECTION_MEA.value', value, 'text', 'value', false, "string", hashMapName);

                                            value = (searchElement)[0].timestamp;
                                            doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'MOTION_DETECTION_MEA.timestamp', value, 'value.datetime', 'timestamp', false, "number", hashMapName);
										}
									}

									break;

								case "35000662": /*DuoFern-Rohrmotor-Aktor*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "WIND_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'WIND_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Wind', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "RAIN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'RAIN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Regen', true, hashMapName);
									break;
									
								case "35002414": /*ZWave-RepeaterMitSchaltfunktion-8434*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									break;

								case "16234511": /*DuoFern-RolloTron-Comfort-1800/1805/1840*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									break;
									
								case "23602075": /*DuoFern-S-Line-Motor-Typ-SLDM-10/16-PZ*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);
									
									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									break;

								case "23783076": /*RolloTube S-line Sun DuoFern SLDSM 30/16PZ*/
								case "23784076": /*RolloTube S-line Sun DuoFern SLDSM 40/16PZ*/
								case "23782076": /*RolloTube S-line Sun DuoFern SLDSM 50/12PZ*/
								case "23785076": /*RolloTube S-line Sun DuoFern SLDSM 50/12PZ*/
								case "25782075": /*RolloTube S-line Zip DuoFern SLDZS 06/28Z, SLDZS 10/16Z, SLDZM 10/16Z, SLDZM 20/16Z, SLDZM 30/16Z, SLDZM 40/16Z, SLDZM 50/12Z*/
									var value = (elementJSON.capabilities.filter((x)=>x.name === "AUTO_MODE_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'AUTO_MODE_CFG', value == 'true' ? true : false, 'switch', 'Automatikbetrieb', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "TIME_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'TIME_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Zeit', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "SUN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SUN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Sonne', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "DAWN_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DAWN_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Morgendämmerung', true, hashMapName);

									var value = (elementJSON.capabilities.filter((x)=>x.name === "DUSK_AUTO_CFG"))[0].value;
									doAttributeWithTypeBoolean(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'DUSK_AUTO_CFG', value == 'true' ? true : false, 'switch', 'Abenddämmerung', true, hashMapName);
									break;

								case "32501972": /*DuoFern-Mehrfachwandtaster*/		
								case "32501974": /*DuoFern-Mehrfachwandtaster-BAT-9494-1*/
									if(await IsAutomaticRefreshAttributesActivated(type + '.' + element + '-' + deviceNumberId)){										
										elementJSON = await limitedGetSpecificAdditional(element);
										var timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_PUSH_CH1_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH1_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_PUSH_CH2_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH2_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_PUSH_CH3_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH3_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_PUSH_CH4_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH4_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_PUSH_CH5_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH5_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_PUSH_CH6_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH6_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
									}
									break;
								
								case "32160211": /*DuoFern-Wandtaster-9494*/
									if(await IsAutomaticRefreshAttributesActivated(type + '.' + element + '-' + deviceNumberId)){										
										elementJSON = await limitedGetSpecificAdditional(element);
										var timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_OFF_CH1_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_OFF_CH1_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_OFF_CH2_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_OFF_CH2_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_ON_CH1_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_ON_CH1_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_ON_CH2_EVT"))[0].timestamp;
										doAttributeWithTypeNumber(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_ON_CH2_EVT', timestamp, 'value.datetime', 'timestamp', hashMapName);
									}
									break;
					
								case "32501973": /*DuoFern-Wandtaster-1-Kanal-9494-3*/
									if(await IsAutomaticRefreshAttributesActivated(type + '.' + element + '-' + deviceNumberId)){
										elementJSON =await limitedGetSpecificAdditional(element);
										var timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_PUSH_CH1_EVT"))[0].timestamp;
										doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH1_EVT', timestamp, 'value.datetime', 'timestamp', false, "number", hashMapName);
										
										timestamp = (elementJSON.capabilities.filter((x)=>x.name === "KEY_PUSH_CH2_EVT"))[0].timestamp;
										doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH2_EVT', timestamp, 'value.datetime', 'timestamp', false, "number", hashMapName);
									}
									break;
									
								default:
									adapter.log.debug('Unknown ' + type + ' additional for deviceNumber=' + deviceNumber +'. For implementation, please contact the developer on GIT repo.');
							}
						}catch(error){
							adapter.log.warn('Read ' + type + '/additional info -> Cannot connect to Homepilot: ' + error );		
						}
					}));
				}
			}
		} 
		else {
			adapter.log.warn('Read ' + type + '/additional info -> Cannot connect to Homepilot: ' + JSON.stringify(response));
			unreach = true;
		}
	}
	catch(error){
		adapter.log.warn('Read ' + type + '/additional info -> Cannot connect to Homepilot: ' + error );
		unreach = true;	
	}
		
	adapter.log.debug('finished reading Homepilot additional ' + type);

	
	// Write connection status
	adapter.setState('station.UNREACH', {
		val: unreach,
		ack: true
	});
}

async function IsAutomaticRefreshAttributesActivated(path){
	const isActivatedState = await adapter.getStateAsync(path + '.Attribute.AutomaticRefreshAttributes');	
	if(isActivatedState){
		adapter.setState(path + '.Attribute.AutomaticRefreshAttributes', {
			val: isActivatedState.val,
			ack: true
		});
		if(isActivatedState.val){			
			return true;
		}
	}	
	return false;		
}	

async function doAttributeWithTypeNumber(did, path, name, value, role, description, hashMapName) {
	doAttribute(did, path, name, value, role, description, false, "number", hashMapName);
}

async function doAttributeWithTypeBoolean(did, path, name, value, role, description, changeable, hashMapName) {
    doAttribute(did, path, name, value, role, description, true, "boolean", hashMapName);
}

async function doAttribute(did, path, name, value, role, description, changeable, type, hashMapName) {
    var def = '';

    if (type == "boolean") {
        def = false;
    } else if (type == "number") {
        def = 0;
    } else if (type == "string") {
        def = '';
    }

    if (description == 'timestamp') {
        adapter.setObjectNotExists(path + name, {
        		type: 'state',
        		common: {
        			name: name + '-' + description,
        			desc: 'name stored in homepilot for device ' + did,
        			"type": type,
        			"role": role,
        			"read": true,
        			"def": def,
        			"write": changeable,
        			"min": -1
        		},
        		native: {}
        	});
    } else {
        adapter.setObjectNotExists(path + name, {
        		type: 'state',
        		common: {
        			name: name + '-' + description,
        			desc: 'name stored in homepilot for device ' + did,
        			"type": type,
        			"role": role,
        			"read": true,
        			"def": def,
        			"write": changeable
        		},
        		native: {}
        	});
    }

    setCorrectState(path, name, value, hashMapName);
}

async function setCorrectState(path, name, value, hashMapName) {
    try {
        var existState = writeStateHashmap.has(hashMapName + name);

        if (!existState || (existState && writeStateHashmap.get(hashMapName + name) != value)) {
             const obj = await adapter.getObjectAsync(path + name);

            if (obj) {
                adapter.setState(path + name, {
                    val: value,
                    ack: true
                });

                writeStateHashmap.set(hashMapName + name, value);
            }
        }   
    } catch (err) {
      adapter.log.warn('State ' + path + name + ' does not exist at the moment! ' + err);
    }
}

function unique(ain) {  
  var seen = {}  
  var aout = []  
  
  for (var i = 0; i < ain.length; i++) {  
    var elt = ain[i]  
    if (!seen[elt]) {  
      aout.push(elt)  
      seen[elt] = true  
    }  
  }  
  
  return aout  
}

function deviceNumberNormalize(deviceNumber) {
	if (deviceNumber.indexOf("_") !== -1) {
		deviceNumber = deviceNumber.substr(0, deviceNumber.indexOf("_"));
	}
	
	return deviceNumber;
}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
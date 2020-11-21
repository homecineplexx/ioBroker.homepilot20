/* jshint -W097 */ // jshint strict:false
/*jslint node: true */

"use strict";
var CryptoJS = require("crypto-js");			//used from Rademacher to encrypt the password
var utils = require('@iobroker/adapter-core'); // Get common adapter utils
var request = require('request');

var lang = 'de';
var ip = '';
var sync = 12;
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
var callReadActuator = null;
var callReadSensor = null;
var callReadTransmitter = null;
var calReadScenes = null;

request = request.defaults({jar: true})

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
		
		if (deviceNumberId == '36500172' /*DuoFern-TrollBasis-5615*/) {
			if (0 >= parseInt(input)) {
				input = 0;
			} else if (parseInt(input) >= 100) {
				input = 100;
			}

			data = '{"name":"GOTO_POS_SLAT_CMD", "value":"' + parseInt(input) + '"}';
		}
	} else if (id.indexOf('Position') !== -1) {
		calcUri = 'http://' + ip + '/devices/' + deviceId;
		
		if (deviceNumberId == '35002414' /*Z-Wave Steckdose*/ ||
			deviceNumberId == '35000262' /*DuoFern-2-Kanal-Aktor-9470-2*/ ||
			deviceNumberId == '35001164' /*DuoFern-Zwischenstecker-Schalten-9472*/ ||
			deviceNumberId == '32501972' /*DuoFern-Mehrfachwandtaster-230V-9494-2*/ ||
			deviceNumberId == '32501772' /*DuoFern-Bewegungsmelder-9484*/) {
			
			data = '{"name":"TURN_OFF_CMD"}'; 
			
			if (input == 'true') {
				data = '{"name":"TURN_ON_CMD"}';
			}
		//role == level.blind
		} else if (deviceNumberId == '35000864' /*DuoFern-Connect-Aktor-9477*/ ||
					deviceNumberId == '14234511' /*DuoFern-RolloTronStandard*/ ||
					deviceNumberId == '35000662' /*DuoFern-Rohrmotor-Aktor*/ ||
					deviceNumberId == '31500162' /*DuoFern-Rohrmotorsteuerung*/ ||
					deviceNumberId == '36500172' /*DuoFern-TrollBasis-5615*/ ||
					deviceNumberId == '27601565' /*DuoFern-Rohrmotor*/ ||
					deviceNumberId == '45059071' /*RolloPort-SX5-DuoFern-RP-SX5DF-900N-3*/ ||
					deviceNumberId == '35000462' /*DuoFern-Universal-Dimmaktor*/ ||
					deviceNumberId == '35140462' /*DuoFern-UniversalDimmer-9476*/ ||
					deviceNumberId == '36500572' /*Duofern-Troll-Comfort-5665*/ ||
					deviceNumberId == '32000064' /*DuoFern-Umweltsensor*/ ||
					deviceNumberId == '16234511' /*DuoFern-RolloTron-Comfort-1800/1805/1840*/ ||
					deviceNumberId == '14236011' /*DuoFern-RolloTron-Pro-Comfort-9800*/ ||
					deviceNumberId == '23602075' /*DuoFern-S-Line-Motor-Typ-SLDM-10/16-PZ*/) {
			if (0 >= parseInt(input)) {
				input = 0;
			} else if (parseInt(input) >= 100) {
				input = 100;
			}

			data = '{"name":"GOTO_POS_CMD", "value":"' + parseInt(input) + '"}';
			
		//role == temperature
		} else if (deviceNumberId == '35003064' /*DuoFern-Heizkörperstellantrieb-9433*/ ||
					deviceNumberId == '35002319' /*Z-Wave-Heizkörperstellantrieb-8433*/) {
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
		} else if (deviceNumberId == '32501812' /*DuoFern-Raumthermostat-9485*/) {
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
				   deviceNumberId == '99999983' /*Philips-Hue-RGB-Lampe*/) {
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
			deviceNumberId == '99999983' /*Philips-Hue-RGB-Lampe*/) {
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
	sync = (adapter.config.synctime === undefined || adapter.config.synctime.length === 0) ? 12 : parseInt(adapter.config.synctime,10);
	adapter.log.debug('Homepilot station and ioBroker synchronize every ' + sync + 's');
	
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
	if (callReadActuator !== null) {
		clearInterval(callReadActuator);
		adapter.log.debug('callReadActuator cleared');
	}
    
	if (callReadSensor !== null) {
		clearInterval(callReadSensor);
		adapter.log.debug('callReadSensor cleared');
	}

	if (callReadTransmitter !== null) {
		clearInterval(callReadTransmitter);
		adapter.log.debug('callReadTransmitter cleared');
	}
	
	if (calReadScenes !== null) {
		clearInterval(calReadScenes);
		adapter.log.debug('calReadScenes cleared');
	}
	
    adapter.log.error('Adapter will be stopped');
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
	
    readSettings();
    adapter.log.debug('Homepilot adapter started...');
	
	if (password !== undefined && password != null && password.length > 0) {
		getPasswordSalt();
	} else {
		password = undefined;
		
		passwordSalt = undefined;
		saltedPassword = undefined;
	}
	
    callReadActuator = setInterval(function() {
        adapter.log.debug('reading homepilot actuator JSON ...');
        readActuator('http://' + ip + '/v4/devices?devtype=Actuator');
    }, sync * 1000);
	
	callReadSensor = setInterval(function() {
        adapter.log.debug('reading homepilot sensor JSON ...');
        readSensor('http://' + ip + '/v4/devices?devtype=Sensor');
    }, 3000);
	
	callReadTransmitter = setInterval(function() {
        adapter.log.debug('reading homepilot transmitter JSON ...');
        readTransmitter('http://' + ip + '/v4/devices?devtype=Transmitter');
    }, 3000);
	
	calReadScenes = setInterval(function() {
        adapter.log.debug('reading homepilot scenes JSON ...');
        readScenes('http://' + ip + '/v4/scenes');
    }, 5000);
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


function readActuator(link) {
    var unreach = false;
	
	//request(link, function(error, response, body) {
    request({
			method: 'GET',
			uri: link,
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			]
		},
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var result;
				try {
					result = JSON.parse(body);
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
					}
					adapter.setState('station.ip', {
						val: ip,
						ack: true
					});
					
					doAdditional(additionalDeviceSettings, 'Actuator');
				}
			} else {
				adapter.log.warn('Read actuator -> Cannot connect to Homepilot: ' + (error ? error : JSON.stringify(response)));
				unreach = true;
			}
			// Write connection status
			adapter.setState('station.UNREACH', {
				val: unreach,
				ack: true
			});
		}
	); // End request 

	additionalDeviceSettings = [];
	
	adapter.log.debug('finished reading Homepilot actuator data');
}

function readSensor(link) {
    var unreach = false;
	
    //request(link, function(error, response, body) {
	request({
			method: 'GET',
			uri: link,
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			]
		},	
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var result;
				try {
					result = JSON.parse(body);
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
					
					doAdditional(additionalSensorSettings, 'Sensor');
				}
			} else {
				adapter.log.warn('Read sensors -> Cannot connect to Homepilot: ' + (error ? error : JSON.stringify(response)));
				unreach = true;
			}
			// Write connection status
			adapter.setState('station.UNREACH', {
				val: unreach,
				ack: true
			});
		}
	); // End request 
	
	additionalSensorSettings = [];
    adapter.log.debug('Finished reading Homepilot sensor data');
}

function readTransmitter(link) {
    var unreach = false;
	
    //request(link, function(error, response, body) {
	request({
			method: 'GET',
			uri: link,
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			]
		},	
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var result;
				try {
					result = JSON.parse(body);
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
					
					doAdditional(additionalTransmitterSettings, 'Transmitter');	
				}
			} else {
				adapter.log.warn('Transmitter sensors -> Cannot connect to Homepilot: ' + (error ? error : JSON.stringify(response)));
				unreach = true;
			}
			// Write connection status
			adapter.setState('station.UNREACH', {
				val: unreach,
				ack: true
			});
		}
	); // End request 
	
	additionalTransmitterSettings = [];
	
    adapter.log.debug('Finished reading Homepilot transmitter data');
}

function readScenes(link) {
	if (isBridge) {
       return;
    }

    var unreach = false;
	
	request({
			method: 'GET',
			uri: link,
			headers: [
				{ 'Cookie': cookie },
				{ 'Content-Type': 'application/json' }
			]
		},	
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var result;
				try {
					result = JSON.parse(body);
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
						createSceneStates(result.scenes[i], 'Scene'); 
						writeSceneStates(result.scenes[i], 'Scene'); 
					}					
				}
			} else {
				adapter.log.warn('Scenes -> Cannot connect to Homepilot: ' + (error ? error : JSON.stringify(response)));
				unreach = true;
			}
			// Write connection status
			adapter.setState('station.UNREACH', {
				val: unreach,
				ack: true
			});
		}
	); // End request 
	
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
			break;
			
		case "32501812":
			deviceType = 'DuoFern-Raumthermostat-9485';
			deviceRole = 'level.temperature';
            break;
		
		case "35002319":
			deviceType = 'ZWave-Heizkörperstellantrieb-8433';
			deviceRole = 'level.temperature';
            break;
        
		case "35002414":
            deviceType = 'ZWave-RepeaterMitSchaltfunktion-8434';
			deviceRole = (deviceName.indexOf('Licht') != -1) ? 'light.switch' : 'switch' ;
            break;
			
        case "35000262":
			deviceType = 'DuoFernUniversal-Aktor2-Kanal-9470-2';
			deviceRole = (deviceName.indexOf('Licht') != -1) ? 'light.switch' : 'switch' ;
            break;
		
        case "35001164":
			deviceType = 'DuoFern-Zwischenstecker-Schalten-9472';
			deviceRole = (deviceName.indexOf('Licht') != -1) ? 'light.switch' : 'switch' ;
            break;
					
		case "32501772":
			deviceType = 'DuoFern-Bewegungsmelder-9484';
			if (type == 'Actuator') {
				deviceRole = (deviceName.indexOf('Licht') != -1) ? 'light.switch' : 'switch' ;
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
            break;
		
		case "14234511":
			deviceType = 'DuoFern-RolloTron-Standard-1400/1405/1440';
			deviceRole = 'level.blind';
            break;
			
		case "35000662":
			deviceType = 'DuoFernRohrmotor-Aktor';
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
			break;	
		
		case "23602075":
			deviceType = 'DuoFern-S-Line-Motor-Typ-SLDM-10/16-PZ';
			deviceRole = 'level.blind';
			break;
			
		case "16234511":
			deviceType = 'DuoFern-RolloTron-Comfort-1800/1805/1840';
			if (type == 'Actuator') {
				deviceRole = 'level.blind';
			}
			break;
		
		case "14236011":
			deviceType = 'DuoFern-RolloTron-Pro-Comfort-9800';
			deviceRole = 'level.blind';
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
		
		case "99999980":
			deviceType = 'Philips-Hue-Bridge';
            break;
		
		case "99999981":
			deviceType = 'Philips-Hue-Weiße-Lampe';
            break;
		
		case "99999982":
			deviceType = 'Philips-Hue-Ambiance-Spot';
            break;
			
		case "99999983":
			deviceType = 'Philips-Hue-RGB-Lampe';
            break;
			
		case "32004219":
			deviceType = 'HD-Kamera-9486';
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
			name: deviceType + ': ' + deviceName + ' (Device ID ' + deviceId + ')',
			role: 'text',
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.deviceNumber', {
		type: 'state',
		common: {
			name: 'deviceNumber ' + deviceName,
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
			name: 'deviceGroup ' + deviceName,
			desc: 'deviceGroup stored in homepilot for device ' + deviceId,
			type: 'string',
			role: 'text',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.description', {
		type: 'state',
		common: {
			name: 'description ' + deviceName,
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
			name: 'did ' + deviceName,
			desc: 'did stored in homepilot for device ' + deviceId,
			type: 'string',
			role: 'text',
			read: true,
			write: false
		},
		native: {}
	});

	adapter.setObjectNotExists(path + '.name', {
		type: 'state',
		common: {
			name: 'name ' + deviceName,
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
		   name: 'statusValid ' + deviceName,
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
		   name: 'visible ' + deviceName,
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
			name: 'uid ' + deviceName,
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
		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceName = result.name;
		var deviceId   = result.did;
		
		createCommon(result);
		
		adapter.setObjectNotExists(path + '.hasErrors', {
			type: 'state',
			common: {
				name: 'number of errors ' + deviceName,
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
				name: 'messages ' + deviceName,
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
					name: 'Position ' + deviceName,
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
						name: 'Position_inverted ' + deviceName,
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
			
			if (deviceNumber == '36500172') {
				adapter.setObjectNotExists(path + '.slatposition', {
					type: 'state',
					common: {
						name: 'slatposition ' + deviceName,
						desc: 'slatposition stored in homepilot for device ' + deviceId,
						type: 'number',
						role: deviceRole,
						min: 0,
						max: 100,
						unit: '%',
						read: true,
						write: false
					},
					native: {}
				});
			}
		} else if (deviceRole == 'level.temperature') {
			if (deviceNumber == '32501812') {
				adapter.setObjectNotExists(path + '.Position', {
					type: 'state',
					common: {
						name: 'Position ' + deviceName,
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
						name: 'Position ' + deviceName,
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
				deviceNumber != '99999983' /*Philips-Hue-RGB-Lampe*/) {
				adapter.setObjectNotExists(path + '.Position', {
					type: 'state',
					common: {
					   name: 'Position ' + deviceName,
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
	
		if (deviceNumber == '35003064') {
			adapter.setObjectNotExists(path + '.batteryStatus', {
				type: 'state',
				common: {
					name: 'batteryStatus ' + deviceName,
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
				   name: 'batteryLow ' + deviceName,
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
					name: 'posMin ' + deviceName,
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
					name: 'posMax ' + deviceName,
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
			deviceNumber == '32501812') {
			adapter.setObjectNotExists(path + '.acttemperatur', {
				type: 'state',
				common: {
					name: 'acttemperatur ' + deviceName,
					desc: 'acttemperatur stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					unit: '°C',
					read: true,
					write: false
				},
				native: {}
			});
			
			if (deviceNumber == '32501812') {
				adapter.setObjectNotExists(path + '.relaisstatus', {
					type: 'state',
					common: {
						name: 'relaisstatus ' + deviceName,
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
						name: 'automaticvalue ' + deviceName,
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
						name: 'manualoverride ' + deviceName,
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
			deviceNumber == '99999983' /*Philips-Hue-RGB-Lampe*/) {
			adapter.setObjectNotExists(path + '.Position', {
				type: 'state',
				common: {
					name: 'Position ' + deviceName,
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
						name: 'ColorTemperature ' + deviceName,
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
				
				if (deviceNumber != '99999982' /*Philips-Hue-Ambiance-Spot*/) {
					adapter.setObjectNotExists(path + '.RGB', {
						type: 'state',
						common: {
							name: 'RGB' + deviceName,
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
		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceName = result.name;
		var deviceId   = result.did;
		
		createCommon(result);
		
		adapter.setObjectNotExists(path + '.timestamp', {
			type: 'state',
			common: {
				name: 'timestamp ' + deviceName,
				desc: 'timestamp stored in homepilot for device ' + deviceId,
				type: 'number',
				role: 'value',
				min: 0,
				read: true,
				write: false
			},
			native: {}
		});
		
		if (deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
			adapter.setObjectNotExists(path + '.smoke_detected', {
				type: 'state',
				common: {
				   name: 'smoke_detected ' + deviceName,
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
				   name: 'movement_detected ' + deviceName,
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
					name: 'sun_brightness ' + deviceName,
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
					name: 'sun_direction ' + deviceName,
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
					name: 'sun_elevation ' + deviceName,
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
					name: 'wind_speed ' + deviceName,
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
				   name: 'rain_detected ' + deviceName,
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
				   name: 'area_entered ' + deviceName,
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
			deviceNumber == '16234511' /*DuoFern-RolloTron-Comfort-1800/1805/1840*/) {
			adapter.setObjectNotExists(path + '.sun_detected', {
				type: 'state',
				common: {
				   name: 'sun_detected ' + deviceName,
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
		
		if (deviceNumber == '32501812' /*DuoFern-Raumthermostat*/ ||
			deviceNumber == '32000064' /*DuoFern-Umweltsensor*/) {
			adapter.setObjectNotExists(path + '.temperature_primary', {
				type: 'state',
				common: {
					name: 'temperature_primary ' + deviceName,
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
		
		if (deviceNumber == '32501812' /*DuoFern-Raumthermostat*/) {
			adapter.setObjectNotExists(path + '.temperature_target', {
				type: 'state',
				common: {
					name: 'temperature_target ' + deviceName,
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
						name: 'contact_state ' + deviceName,
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
						name: 'batteryStatus ' + deviceName,
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
					   name: 'batteryLow ' + deviceName,
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
		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceName = result.name;
		var deviceId   = result.did;
		
		createCommon(result);

		if (deviceNumber == '32160211' /*DuoFern-Wandtaster-9494*/ ||
			deviceNumber == '32501974' /*DuoFern-Mehrfachwandtaster-BAT-9494-1*/ ||
			deviceNumber == '34810060' /*DuoFern-Handzentrale-9493*/ ||
			deviceNumber == '32480366' /*DuoFern-Handsender-Standard-9491*/ ||
			deviceNumber == '32480361' /*DuoFern-Handsender-Standard-9491-2*/ ||
			deviceNumber == '32501973' /*DuoFern-Wandtaster-1-Kanal-9494-3*/) {
				adapter.setObjectNotExists(path + '.batteryLow', {
					type: 'state',
					common: {
					   name: 'batteryLow ' + deviceName,
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
	
	path = undefined;
	deviceRole = undefined;	
	deviceType = undefined;
}

function createSceneStates(result, type) {
	calculatePath(result, type);

	if (deviceType !== undefined) {
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
				name: 'description ' + sid,
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
			   name: 'active ' + sid,
				desc: 'active stored in homepilot for scene ' + sid,
				type: 'boolean',
				role: deviceRole,
				def: false,
				read: true,
				write: true
			},
			native: {}
		});
		
		adapter.setObjectNotExists(path + '.isExecutable', {
			type: 'state',
			common: {
			   name: 'isExecutable ' + sid,
				desc: 'isExecutable stored in homepilot for scene ' + sid,
				type: 'boolean',
				role: 'text',
				def: true,
				read: true,
				write: false
			},
			native: {}
		});
		
		adapter.setObjectNotExists(path + '.name', {
			type: 'state',
			common: {
				name: 'name ' + sid,
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
			   name: 'execute ' + sid,
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


function writeCommon(result) {
	adapter.setState(path + '.deviceNumber', {
		val: result.deviceNumber,
		ack: true
	});
	
	adapter.setState(path + '.deviceGroup', {
		val: result.deviceGroup,
		ack: true
	});
	
	adapter.setState(path + '.description', {
		val: result.description,
		ack: true
	});
	
	adapter.setState(path + '.did', {
		val: result.did,
		ack: true
	});

	adapter.setState(path + '.name', {
		val: result.name,
		ack: true
	});
	
	adapter.setState(path + '.statusValid', {
		val: result.statusValid,
		ack: true
	});

	adapter.setState(path + '.visible', {
		val: result.visible,
		ack: true
	});

	adapter.setState(path + '.uid', {
		val: result.uid,
		ack: true
	});
}

function writeActuatorStates(result, type) {
	calculatePath(result, type);
	
	//if (deviceRole !== undefined) {	
	if (deviceType !== undefined) {
		var deviceNumber = deviceNumberNormalize(result.deviceNumber);
		var deviceId   = result.did;
		
		writeCommon(result);
		
		adapter.setState(path + '.hasErrors', {
			val: result.hasErrors,
			ack: true
		});
		
		if (result.hasErrors > 0) {
			adapter.log.info('Homepilot Device ' + deviceId + ' reports ' + result.hasErrors + ' error: ' + JSON.stringify(result.messages)); 
			
			adapter.setState(path + '.messages', {
				val: JSON.stringify(result.messages),
				ack: true
			});
		} else {
			adapter.setState(path + '.messages', {
				val: '',
				ack: true
			});
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
			deviceNumber != '99999983' /*Philips-Hue-RGB-Lampe*/) {
			adapter.setState(path + '.Position', {
				val: value,
				ack: true
			});
		}
		
		if (deviceRole == 'level.blind') {
			adapter.setState(path + '.Position_inverted', {
				val: (100 -value),
				ack: true
			});
		}
		
		if (deviceNumber == '36500172') {
			adapter.setState(path + '.slatposition', {
				val: result.statusesMap.slatposition,
				ack: true
			});
		}
		
		if (deviceNumber == '35003064') {
			adapter.setState(path + '.batteryStatus', {
				val: result.batteryStatus,
				ack: true
			});
			
			adapter.setState(path + '.batteryLow', {
				val: result.batteryLow,
				ack: true
			});
			
			adapter.setState(path + '.posMin', {
				val: result.posMin / 10,
				ack: true
			});
			
			adapter.setState(path + '.posMax', {
				val: result.posMax / 10,
				ack: true
			});	
		}
	
		if (deviceNumber == '35003064' ||
			deviceNumber == '32501812') {
			adapter.setState(path + '.acttemperatur', {
				val: result.statusesMap.acttemperatur / 10,
				ack: true
			});
			
			if (deviceNumber == '32501812') {
				adapter.setState(path + '.relaisstatus', {
					val: result.statusesMap.relaisstatus,
					ack: true
				});
				
				adapter.setState(path + '.automaticvalue', {
					val: result.statusesMap.automaticvalue,
					ack: true
				});
				
				adapter.setState(path + '.manualoverride', {
					val: result.statusesMap.manualoverride,
					ack: true
				});
			}
		}
		
		if (deviceNumber == '99999981' /*Philips-Hue-Weiße-Lampe*/ ||
			deviceNumber == '99999982' /*Philips-Hue-Ambiance-Spot*/ ||
			deviceNumber == '99999983' /*Philips-Hue-RGB-Lampe*/) {
			adapter.setState(path + '.Position', {
				val: result.statusesMap.Position,
				ack: true
			});
			
			if (deviceNumber != '99999981' /*Philips-Hue-RGB-Lampe*/) {
				adapter.setState(path + '.ColorTemperature', {
					val: result.statusesMap.colortemperature,
					ack: true
				});

				if (deviceNumber != '99999982' /*Philips-Hue-Ambiance-Spot*/) {
					var rgbValue = result.statusesMap.rgb;
					rgbValue = rgbValue.startsWith('0x') ? rgbValue.substring(2, rgbValue.length) : rgbValue;
					
					adapter.setState(path + '.RGB', {
						val: rgbValue,
						ack: true
					});
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
		
		writeCommon(result);

		adapter.setState(path + '.timestamp', {
			val: result.timestamp,
			ack: true
		});

		if (deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
			adapter.setState(path + '.smoke_detected', {
				val: result.readings.smoke_detected,
				ack: true
			});
		}
		
		if (deviceNumber == '32501772' /*DuoFern-Bewegungsmelder-9484*/ ||
			deviceNumber == '32004329' /*HD-Kamera-9487-A*/ ||
			deviceNumber == '32004119' /*IP-Kamera 9483*/ ||
			deviceNumber == '32004219' /*HD-Kamera-9486*/) {
			adapter.setState(path + '.movement_detected', {
				val: result.readings.movement_detected,
				ack: true
			});
		}
		
		if (deviceNumber == '32000064' /*DuoFern-Umweltsensor*/) {
			adapter.setState(path + '.sun_brightness', {
				val: result.readings.sun_brightness,
				ack: true
			});
			
			adapter.setState(path + '.sun_direction', {
				val: result.readings.sun_direction,
				ack: true
			});
			
			adapter.setState(path + '.sun_elevation', {
				val: result.readings.sun_elevation,
				ack: true
			});
			
			adapter.setState(path + '.wind_speed', {
				val: result.readings.wind_speed,
				ack: true
			});
			
			adapter.setState(path + '.rain_detected', {
				val: result.readings.rain_detected,
				ack: true
			});
		}
		
		if (deviceNumber == '99999998' /*GeoPilot (Handy)*/ ||
			deviceNumber == '99999999' /*GeoPilot (Handy)*/) {
			adapter.setState(path + '.area_entered', {
				val: result.readings.area_entered,
				ack: true
			});
		}
		
		if (deviceNumber == '36500572' /*Duofern-Troll-Comfort-5665*/ ||
			deviceNumber == '32000064' /*DuoFern-Umweltsensor*/ ||
			deviceNumber == '32000069' /*DuoFern-Sonnensensor-9478*/ ||
			deviceNumber == '16234511' /*DuoFern-RolloTron-Comfort-1800/1805/1840*/) {
			adapter.setState(path + '.sun_detected', {
				val: result.readings.sun_detected,
				ack: true
			});
		}
		
		if (deviceNumber == '32501812' /*DuoFern-Raumthermostat*/ ||
			deviceNumber == '32000064' /*DuoFern-Umweltsensor*/) {
			adapter.setState(path + '.temperature_primary', {
				val: result.readings.temperature_primary,
				ack: true
			});
		}
		
		if (deviceNumber == '32501812' /*DuoFern-Raumthermostat*/) {		
			adapter.setState(path + '.temperature_target', {
				val: result.readings.temperature_target,
				ack: true
			});
		} 
		
		if (deviceNumber == '32002119' /*Z-Wave-FensterTürkontakt*/ ||
			deviceNumber == '32003164' /*DuoFern-FensterTürkontakt-9431*/ ||
			deviceNumber == '32000062' /*DuoFern-Funksender-UP-9497*/ ||
			deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
			
			if (deviceNumber != '32001664' /*DuoFern-Rauchmelder-9481*/) {
				adapter.setState(path + '.contact_state', {
					val: result.readings.contact_state,
					ack: true
				});
			}
			
			if (deviceNumber != '32000062' /*DuoFern-Funksender-UP-9497*/) {
				adapter.setState(path + '.batteryStatus', {
					val: result.batteryStatus,
					ack: true
				});
			}
			
			if (deviceNumber == '32003164' /*DuoFern-FensterTürkontakt-9431*/ ||
				deviceNumber == '32001664' /*DuoFern-Rauchmelder-9481*/) {
				adapter.setState(path + '.batteryLow', {
					val: result.batteryLow,
					ack: true
				});
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
		
		writeCommon(result);

		if (deviceNumber == '32160211' /*DuoFern-Wandtaster-9494*/ ||
			deviceNumber == '32501974' /*DuoFern-Mehrfachwandtaster-BAT-9494-1*/ ||
			deviceNumber == '34810060' /*DuoFern-Handzentrale-9493*/ ||
			deviceNumber == '32480366' /*DuoFern-Handsender-Standard-9491*/ ||
			deviceNumber == '32480361' /*DuoFern-Handsender-Standard-9491-2*/ ||
			deviceNumber == '32501973' /*DuoFern-Wandtaster-1-Kanal-9494-3*/) {
				adapter.setState(path + '.batteryLow', {
					val: result.batteryLow,
					ack: true
				});
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
		
		adapter.setState(path + '.description', {
			val: result.description,
			ack: true
		});
		
		adapter.setState(path + '.active', {
			val: result.active,
			ack: true
		});
		
		adapter.setState(path + '.isExecutable', {
			val: result.isExecutable,
			ack: true
		});
		
		adapter.setState(path + '.name', {
			val: result.name,
			ack: true
		});
	}
}

function doAdditional(toDoList, type) {
	var unreach = false;
	
	if (toDoList.length > 0) {
		toDoList = unique(toDoList);
	
		toDoList.forEach(function(element) {	  
			request({
				method: 'GET',
				uri: 'http://' + ip + '/devices/' + element,
				headers: [
					{ 'Cookie': cookie },
					{ 'Content-Type': 'application/json' }
				]
			},	
				function(error, response, body) {
					if (!error && response.statusCode == 200) {
						var result;
						try {
							result = JSON.parse(body);
							var data = JSON.stringify(result, null, 2);
							adapter.log.debug('Homepilot additional ' + type + ' (' + element + ') data: ' + data);
						} catch (e) {
							adapter.log.warn('Parse Error: ' + e);
							unreach = true;
						}
						if (result) {
							var deviceHelper = (result.payload.device.capabilities.filter((x)=>x.name === "PROD_CODE_DEVICE_LOC"))[0].value;
							var deviceNumberId = deviceNumberNormalize(deviceHelper);
							
							switch(deviceNumberId) {
								case "32501772": /*DuoFern-Bewegungsmelder-9484*/													
									var value = (result.payload.device.capabilities.filter((x)=>x.name === "ON_DURATION_CFG"))[0].value;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'ON_DURATION_CFG', value, 'text', 'value');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "ON_DURATION_CFG"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'ON_DURATION_CFG', value, 'value.datetime', 'timestamp');
																		
									value = (result.payload.device.capabilities.filter((x)=>x.name === "BUTTON_MODE_CFG"))[0].value;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'BUTTON_MODE_CFG', value, 'text', 'value');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "BUTTON_MODE_CFG"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'BUTTON_MODE_CFG', value, 'value.datetime', 'timestamp');
																		
									value = (result.payload.device.capabilities.filter((x)=>x.name === "SENSOR_SENSITIVITY_CFG"))[0].value;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SENSOR_SENSITIVITY_CFG', value, 'text', 'value');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "SENSOR_SENSITIVITY_CFG"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'SENSOR_SENSITIVITY_CFG', value, 'value.datetime', 'timestamp');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "MOVE_STOP_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'MOVE_STOP_EVT', value, 'value.datetime', 'timestamp');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "MOVE_START_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'MOVE_START_EVT', value, 'value.datetime', 'timestamp');
																
									value = (result.payload.device.capabilities.filter((x)=>x.name === "LIGHT_VAL_LUX_MEA"))[0].value;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'LIGHT_VAL_LUX_MEA', value, 'text', 'value');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "LIGHT_VAL_LUX_MEA"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'LIGHT_VAL_LUX_MEA', value, 'value.datetime', 'timestamp');

									value = (result.payload.device.capabilities.filter((x)=>x.name === "LED_BEHAV_MODE_CFG"))[0].value;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'LED_BEHAV_MODE_CFG', value, 'text', 'value');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "LED_BEHAV_MODE_CFG"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'LED_BEHAV_MODE_CFG', value, 'value.datetime', 'timestamp');

									value = (result.payload.device.capabilities.filter((x)=>x.name === "CURR_BRIGHTN_CFG"))[0].value;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'CURR_BRIGHTN_CFG', value, 'text', 'value');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "CURR_BRIGHTN_CFG"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'CURR_BRIGHTN_CFG', value, 'value.datetime', 'timestamp');

									value = (result.payload.device.capabilities.filter((x)=>x.name === "MOTION_DETECTION_MEA"))[0].value;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'MOTION_DETECTION_MEA', value, 'text', 'value');
									
									value = (result.payload.device.capabilities.filter((x)=>x.name === "MOTION_DETECTION_MEA"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'MOTION_DETECTION_MEA', value, 'value.datetime', 'timestamp');
									break;
								
								case "32501972": /*DuoFern-Mehrfachwandtaster*/		
								case "32501974": /*DuoFern-Mehrfachwandtaster-BAT-9494-1*/
									var timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH1_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH1_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH2_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH2_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH3_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH3_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH4_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH4_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH5_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH5_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH6_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH6_EVT', timestamp, 'value.datetime', 'timestamp');
									break;
								
								case "32160211": /*DuoFern-Wandtaster-9494*/
									var timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_OFF_CH1_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_OFF_CH1_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_OFF_CH2_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_OFF_CH2_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_ON_CH1_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_ON_CH1_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_ON_CH2_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_ON_CH2_EVT', timestamp, 'value.datetime', 'timestamp');
									break;

								case "32501973": /*DuoFern-Wandtaster-1-Kanal-9494-3*/
									var timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH1_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH1_EVT', timestamp, 'value.datetime', 'timestamp');
									
									timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH2_EVT"))[0].timestamp;
									doAttribute(element, type + '.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH2_EVT', timestamp, 'value.datetime', 'timestamp');
									break;
									
								default:
									adapter.log.debug('Unknown ' + type + ' additional for deviceNumber=' + deviceNumber +'. For implementation, please contact the developer on GIT repo.');
							}
						}
					} else {
						adapter.log.warn('Read ' + type + '/additional info -> Cannot connect to Homepilot: ' + (error ? error : JSON.stringify(response)));
						unreach = true;
					}
				}
			); // End request 
			
			adapter.log.debug('finished reading Homepilot additional ' + type + ' data for deviceId=' + element);
		});
		
		// Write connection status
		adapter.setState('station.UNREACH', {
			val: unreach,
			ack: true
		});
	}
}

function doAttribute(did, path, name, value, role, description) {
	adapter.setObjectNotExists(path + name + '-' + description, {
		type: 'state',
		common: {
			name: name + '-' + description,
			desc: 'name stored in homepilot for device ' + did,
			"type": "number",
			"role": role,
			"read": true,
			"write": false
		},
		native: {}
	});
	
	adapter.setState(path + name + '-' + description, {
		val: value,
		ack: true
	});
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
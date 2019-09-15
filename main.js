/* jshint -W097 */ // jshint strict:false
/*jslint node: true */

"use strict";
var utils = require('@iobroker/adapter-core'); // Get common adapter utils
var request = require('request');
var lang = 'de';
var callReadActuator;
var callReadSensor;
var ip = '';
var sync = 12;

// needed variable
var pathActuator;
var pathSensor
var deviceRole;
var deviceTypeActuator;
var deviceTypeSensor;
var additionalDeviceSettings = [];

var adapter = utils.Adapter({
    name: 'homepilot20',
    systemConfig: true,
    useFormatDate: true,
    stateChange: function(id, state) {
        if (!id || !state || state.ack) return;
        //if ((!id.match(/\.level\w*$/) || (!id.match(/\.cid\w*$/)) return; // if datapoint is not "level" or not "cid"
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

function stopReadHomepilot() {
    clearInterval(callReadActuator);
	clearInterval(callReadSensor);
    adapter.log.info('Homepilot adapter stopped');
}

function controlHomepilot(id, input) {
	adapter.log.debug('id ' + id + '  command: ' + input);
	
	var controller_array = id.split('.');
	var deviceIdNumber_array = controller_array[3].split('-');
	var deviceId = deviceIdNumber_array[0];
	var deviceNumberId = deviceIdNumber_array[1];
	
	var data; 
	
	if (deviceNumberId == '35002414' || deviceNumberId == '35000262' ||
		deviceNumberId == '35001164' || deviceNumberId == '32501972_A') {
		
		data = JSON.stringify({"name":"TURN_OFF_CMD"}); 
		
		if (input == 'true') {
			data = JSON.stringify({"name":"TURN_ON_CMD"});
		}
	} else if (deviceNumberId == '35000864' || deviceNumberId == '14234511' ||
				deviceNumberId == '35000662') {
		if (0 >= parseInt(input)) {
			input = 0;
		} else if (parseInt(input) >= 100) {
			input = 100;
		}
		
		data = JSON.stringify({"name":"GOTO_POS_CMD", "value":"" + parseInt(input) + ""});
	} else if (deviceNumberId == '35003064' || deviceNumberId == '35002319') {
		//range 40°C-280°C in 0.5°C steps
		var val = (parseFloat(input)*10);
		
		if (val < 40) {
			val = 40;
		} else if (val > 280) {
			val = 280;
		}
		
		val = (val%5<3 ? (val%5===0 ? val : Math.floor(val/5)*5) : Math.ceil(val/5)*5) / 10;
		
		data = JSON.stringify({"name":"TARGET_TEMPERATURE_CFG", "value":"" + val + ""});
	} else if (deviceNumberId == '32501812_A') {
		//range 40°C-400°C in 0.5°C steps
		var val = (parseFloat(input)*10);
		
		if (val < 40) {
			val = 40;
		} else if (val > 400) {
			val = 400;
		}
		
		val = (val%5<3 ? (val%5===0 ? val : Math.floor(val/5)*5) : Math.ceil(val/5)*5) / 10;
				
		data = JSON.stringify({"name":"TARGET_TEMPERATURE_CFG", "value":"" + val + ""});
	}
	
	if (data !== undefined) {
		request({
			method: 'PUT',
			uri: 'http://' + ip + '/devices/' + deviceId,
			headers: [
				{
					'Content-Type': 'application/json',
				}
			  ],
			body: data
		  },
		  function (error, response, body) {
			if (error) {
				return adapter.log.error('Change Request Error:', error);
			} else {
				return adapter.log.debug('Change Request OK');
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
		adapter.log.error('Adapter will be stopped');
		stopReadHomepilot();
    } else ip = (adapter.config.homepilotport.length > 0) ? adapter.config.homepilotip + ':' + adapter.config.homepilotport : adapter.config.homepilotip;
		
	//check if sync time is entered in settings
	sync = (adapter.config.synctime === undefined || adapter.config.synctime.length === 0) ? 12 : parseInt(adapter.config.synctime,10);
    adapter.log.debug('Homepilot station and ioBroker synchronize every ' + sync + 's');
}

function calculateActuatorPathAndRole(result, i) {
	var deviceId   = result.devices[i].did;
    var deviceName = result.devices[i].name;
	var deviceNumber = result.devices[i].deviceNumber;
	
	pathActuator = 'Actuator.' + deviceId + '-' + deviceNumber;

	switch (deviceNumber) {
		case "35003064":
            deviceTypeActuator = 'DuoFernHeizkörperstellantrieb';
			deviceRole = 'level.temperature';
			break;
			
		case "32501812_A":
			deviceTypeActuator = 'DuoFernRaumthermostat';
			deviceRole = 'level.temperature';
            break;
        
		case "35002414":
            deviceTypeActuator = 'RepeaterMitSchaltfunktionZ-Wave';
			deviceRole = (deviceName.indexOf('Licht') != -1) ? 'light.switch' : 'switch' ;
            break;
			
        case "35000262":
			deviceTypeActuator = 'DuoFernUniversal-Aktor2-Kanal';
			deviceRole = (deviceName.indexOf('Licht') != -1) ? 'light.switch' : 'switch' ;
            break;
		
        case "35001164":
			deviceTypeActuator = 'DuoFernSteckdose';
			deviceRole = (deviceName.indexOf('Licht') != -1) ? 'light.switch' : 'switch' ;
            break;
		
		case "32501972_A":
			deviceTypeActuator = 'DuoFernMehrfachwandtaster';
			deviceRole = 'switch';
			additionalDeviceSettings.push(deviceId + 1);
            break;
			
        case "35000864":
			deviceTypeActuator = 'DuoFernConnect-Aktor';
			deviceRole = 'level.blind';
            break;
		
		case "14234511":
			deviceTypeActuator = 'DuoFernRolloTronStandard';
			deviceRole = 'level.blind';
            break;
			
		case "35000662":
			deviceTypeActuator = 'DuoFernRohrmotor-Aktor';
			deviceRole = 'level.blind';
            break;
					
        default:
            adapter.log.warn('Unknown deviceNumber=' + deviceNumber);
    }
}

function createActuatorStates(result, i) {
	var deviceGroup = result.devices[i].deviceGroup;
	var deviceId   = result.devices[i].did;
    var deviceName = result.devices[i].name;
	var deviceNumber = result.devices[i].deviceNumber;
	var deviceDescription = result.devices[i].description;	
	
	calculateActuatorPathAndRole(result, i);
	
	if (deviceRole !== undefined) {
		// create Channel DeviceID
		adapter.setObjectNotExists(pathActuator, {
			type: 'channel',
			common: {
				name: deviceTypeActuator + ': ' + deviceName + ' (Device ID ' + deviceId + ')',
				role: deviceRole,
			},
			native: {}
		});
		
		// create States
		adapter.setObjectNotExists(pathActuator + '.description', {
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
		
		adapter.setObjectNotExists(pathActuator + '.deviceGroup', {
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
		
		adapter.setObjectNotExists(pathActuator + '.did', {
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
		
		adapter.setObjectNotExists(pathActuator + '.hasErrors', {
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
		
		adapter.setObjectNotExists(pathActuator + '.name', {
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
		
		adapter.setObjectNotExists(pathActuator + '.statusValid', {
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
		
		adapter.setObjectNotExists(pathActuator + '.visible', {
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
		
		adapter.setObjectNotExists(pathActuator + '.deviceNumber', {
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
		
		adapter.setObjectNotExists(pathActuator + '.uid', {
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
	
		if (deviceRole == 'level.blind') {
			adapter.setObjectNotExists(pathActuator + '.Position', {
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
		} else if (deviceRole == 'level.temperature') {
			if (deviceNumber == '32501812_A') {
				adapter.setObjectNotExists(pathActuator + '.Position', {
					type: 'state',
					common: {
						name: 'Position ' + deviceName,
						desc: 'Position stored in homepilot for device ' + deviceId,
						type: 'number',
						role: deviceRole,
						min: 40,
						max: 400,
						unit: '°C',
						read: true,
						write: true
					},
					native: {}
				});
			} else {
				adapter.setObjectNotExists(pathActuator + '.Position', {
					type: 'state',
					common: {
						name: 'Position ' + deviceName,
						desc: 'Position stored in homepilot for device ' + deviceId,
						type: 'number',
						role: deviceRole,
						min: 40,
						max: 280,
						unit: '°C',
						read: true,
						write: true
					},
					native: {}
				});
			}		
		} else {
			adapter.setObjectNotExists(pathActuator + '.Position', {
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
	
		if (deviceNumber === '35003064') {
			adapter.setObjectNotExists(pathActuator + '.batteryStatus', {
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
			
			adapter.setObjectNotExists(pathActuator + '.batteryLow', {
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
			
			adapter.setObjectNotExists(pathActuator + '.posMin', {
				type: 'state',
				common: {
					name: 'posMin ' + deviceName,
					desc: 'posMin stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					min: 40,
					read: true,
					write: false
				},
				native: {}
			});
			
			adapter.setObjectNotExists(pathActuator + '.posMax', {
				type: 'state',
				common: {
					name: 'posMax ' + deviceName,
					desc: 'posMax stored in homepilot for device ' + deviceId,
					type: 'number',
					role: 'value',
					min: 280,
					read: true,
					write: false
				},
				native: {}
			});	
		}
		
		if (deviceNumber === '35003064' || deviceNumber === '32501812_A') {
			adapter.setObjectNotExists(pathActuator + '.acttemperatur', {
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
			
			if (deviceNumber === '32501812_A') {
				adapter.setObjectNotExists(pathActuator + '.relaisstatus', {
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
				
				adapter.setObjectNotExists(pathActuator + '.automaticvalue', {
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
				
				adapter.setObjectNotExists(pathActuator + '.manualoverride', {
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
	}
	
	pathActuator = undefined;
	deviceRole = undefined;	
	deviceTypeActuator = undefined;
}

function writeActuatorStates(result, i) {
	var deviceNumber = result.devices[i].deviceNumber;
	var deviceId   = result.devices[i].did;
	
	calculateActuatorPathAndRole(result, i);
		
	if (pathActuator !== undefined) {
		adapter.setState(pathActuator + '.description', {
			val: result.devices[i].description,
			ack: true
		});
		
		adapter.setState(pathActuator + '.deviceGroup', {
			val: result.devices[i].deviceGroup,
			ack: true
		});
	
		adapter.setState(pathActuator + '.did', {
			val: deviceId,
			ack: true
		});
		
		adapter.setState(pathActuator + '.hasErrors', {
			val: result.devices[i].hasErrors,
			ack: true
		});
		
		if (result.devices[i].hasErrors > 0) adapter.log.warn('Homepilot Device ' + deviceId + ' reports an error'); // find logic to reduce to one message only
		
		adapter.setState(pathActuator + '.name', {
			val: result.devices[i].name,
			ack: true
		});
		
		adapter.setState(pathActuator + '.statusValid', {
			val: result.devices[i].statusValid,
			ack: true
		});
	
		adapter.setState(pathActuator + '.visible', {
			val: result.devices[i].visible,
			ack: true
		});
		
		adapter.setState(pathActuator + '.deviceNumber', {
			val: deviceNumber,
			ack: true
		});
		
		adapter.setState(pathActuator + '.uid', {
			val: result.devices[i].uid,
			ack: true
		});
		
		var value = result.devices[i].statusesMap.Position;
		
		if (deviceRole == 'light.switch' || deviceRole == 'switch') {
			value = (result.devices[i].statusesMap.Position == '100');
		} else if (deviceRole == 'level.temperature') {
			value = value / 10;
		}
		
		adapter.setState(pathActuator + '.Position', {
			val: value,
			ack: true
		});
			
		if (deviceNumber === '35003064') {
			adapter.setState(pathActuator + '.batteryStatus', {
				val: result.devices[i].batteryStatus,
				ack: true
			});
			
			adapter.setState(pathActuator + '.batteryLow', {
				val: result.devices[i].batteryLow,
				ack: true
			});
			
			adapter.setState(pathActuator + '.posMin', {
				val: result.devices[i].posMin,
				ack: true
			});
			
			adapter.setState(pathActuator + '.posMax', {
				val: result.devices[i].posMax,
				ack: true
			});	
		}
	
		if (deviceNumber === '35003064' || deviceNumber === '32501812_A') {
			adapter.setState(pathActuator + '.acttemperatur', {
				val: result.devices[i].statusesMap.acttemperatur / 10,
				ack: true
			});
			
			if (deviceNumber === '32501812_A') {
				adapter.setState(pathActuator + '.relaisstatus', {
					val: result.devices[i].statusesMap.relaisstatus,
					ack: true
				});
				
				adapter.setState(pathActuator + '.automaticvalue', {
					val: result.devices[i].statusesMap.automaticvalue,
					ack: true
				});
				
				adapter.setState(pathActuator + '.manualoverride', {
					val: result.devices[i].statusesMap.manualoverride,
					ack: true
				});
			}
		}
		
		adapter.log.debug('Actuator states for ' + deviceId + ' written');
	}
	
	pathActuator = undefined;
	deviceRole = undefined;
	deviceTypeActuator = undefined;
}

function readActuator(link) {
    var unreach = true;
	
    request(link, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result;
            try {
                result = JSON.parse(body);
                var data = JSON.stringify(result, null, 2);
                unreach = false;
                adapter.log.debug('Homepilot Actuator data: ' + data);
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
                    createActuatorStates(result, i); 
                    writeActuatorStates(result, i); 
                }
                adapter.setState('station.ip', {
                    val: ip,
                    ack: true
                });
				
				//hier rein
				additionalDeviceSettings = unique(additionalDeviceSettings);
				
				additionalDeviceSettings.forEach(function(element) {	  
				adapter.log.debug('chrk   element=' + element);
					request('http://' + ip + '/devices/' + element, function(error, response, body) {
						if (!error && response.statusCode == 200) {
							var result;
							try {
								result = JSON.parse(body);
								var data = JSON.stringify(result, null, 2);
								adapter.log.debug('Homepilot additional device (' + element + ') data: ' + data);
							} catch (e) {
								adapter.log.warn('Parse Error: ' + e);
							}
							if (result) {
								var deviceHelper = (result.payload.device.capabilities.filter((x)=>x.name === "PROD_CODE_DEVICE_LOC"))[0].value;
								var deviceNumberId = deviceHelper.substring(0, deviceHelper.indexOf("_")) + '_A';
								
								switch(deviceNumberId) {
									case "32501972_A":
										element = element - 1;
										
										var timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH1_EVT"))[0].timestamp;
										doAttribute(element, 'Actuator.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH1_EVT', timestamp);
										
										timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH2_EVT"))[0].timestamp;
										doAttribute(element, 'Actuator.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH2_EVT', timestamp);
										
										timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH3_EVT"))[0].timestamp;
										doAttribute(element, 'Actuator.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH3_EVT', timestamp);
										
										timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH4_EVT"))[0].timestamp;
										doAttribute(element, 'Actuator.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH4_EVT', timestamp);
										
										timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH5_EVT"))[0].timestamp;
										doAttribute(element, 'Actuator.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH5_EVT', timestamp);
										
										timestamp = (result.payload.device.capabilities.filter((x)=>x.name === "KEY_PUSH_CH6_EVT"))[0].timestamp;
										doAttribute(element, 'Actuator.' + element + '-' + deviceNumberId + '.Attribute.', 'KEY_PUSH_CH6_EVT', timestamp);
									break;
								}
							}
						} else {
							adapter.log.warn('Cannot connect to Homepilot: ' + error);
						}
					}); // End request 
					
					adapter.log.debug('finished reading Homepilot additional Data for deviceId=' + element);
				});
            }
        } else {
            adapter.log.warn('Cannot connect to Homepilot: ' + error);
            unreach = true;
        }
        // Write connection status
        adapter.setState('station.UNREACH', {
            val: unreach,
            ack: true
        });
    }); // End request 

	additionalDeviceSettings = [];
	
	adapter.log.debug('finished reading Homepilot Actuator Data');
}
function doAttribute(did, path, name, value) {
	// create States
	adapter.setObjectNotExists(path + name, {
		type: 'state',
		common: {
			name: name,
			desc: 'name stored in homepilot for device ' + did,
			"type": "number",
			"role": "value.datetime",
			"read": true,
			"write": false
		},
		native: {}
	});
	
	adapter.setState(path + name, {
		val: value,
		ack: true
	});
}

function calculateSensor(result, i) {
	var deviceId   = result.meters[i].did;
    var deviceName = result.meters[i].name;
	var deviceNumber = result.meters[i].deviceNumber;
	
	pathSensor = 'Sensor.' + deviceId + '-' + deviceNumber;

	switch (deviceNumber) {
		case "32501812_S":
            deviceTypeSensor = 'DuoFern-Raumthermostat';
			break;
	
		case "32002119":
			deviceTypeSensor = 'Z-Wave-FensterTürkontakt';
            break;
			
		case "32003164":
			deviceTypeSensor = 'DuoFern-FensterTürkontakt-9431';
            break;
					
        default:
            adapter.log.warn('Unknown deviceNumber=' + deviceNumber);
    }
}

function createSensorStates(result, i) {
	var deviceGroup = result.meters[i].deviceGroup;
	var deviceId   = result.meters[i].did;
    var deviceName = result.meters[i].name;
	var deviceNumber = result.meters[i].deviceNumber;
	var deviceDescription = result.meters[i].description;	
	
	calculateSensor(result, i);
	
	if (deviceTypeSensor !== undefined) {
		// create Channel DeviceID
		adapter.setObjectNotExists(pathSensor, {
			type: 'channel',
			common: {
				name: deviceTypeSensor + ': ' + deviceName + ' (Device ID ' + deviceId + ')',
				role: 'text',
			},
			native: {}
		});
		
		// create States
		adapter.setObjectNotExists(pathSensor + '.description', {
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
		
		adapter.setObjectNotExists(pathSensor + '.deviceGroup', {
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
		
		adapter.setObjectNotExists(pathSensor + '.did', {
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
		
		adapter.setObjectNotExists(pathSensor + '.timestamp', {
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
		
		adapter.setObjectNotExists(pathSensor + '.name', {
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
		
		adapter.setObjectNotExists(pathSensor + '.statusValid', {
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
		
		adapter.setObjectNotExists(pathSensor + '.deviceNumber', {
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
				
		adapter.setObjectNotExists(pathSensor + '.visible', {
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
			
		adapter.setObjectNotExists(pathSensor + '.uid', {
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

		if (deviceNumber === '32501812_S') {
			adapter.setObjectNotExists(pathSensor + '.temperature_primary', {
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
			
			adapter.setObjectNotExists(pathSensor + '.temperature_target', {
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
		
		if (deviceNumber === '32002119' || deviceNumber == '32003164') {
			adapter.setObjectNotExists(pathSensor + '.contact_state', {
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
			
			adapter.setObjectNotExists(pathSensor + '.batteryStatus', {
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
			
			if (deviceNumber == '32003164') {
				adapter.setObjectNotExists(pathSensor + '.batteryLow', {
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
	
	pathSensor = undefined;
	deviceTypeSensor = undefined;
}

function writeSensorStates(result, i) {
	var deviceNumber = result.meters[i].deviceNumber;
	var deviceId   = result.meters[i].did;
	
	calculateSensor(result, i);
		
	if (deviceTypeSensor !== undefined) {
		adapter.setState(pathSensor + '.description', {
			val: result.meters[i].description,
			ack: true
		});
		
		adapter.setState(pathSensor + '.deviceGroup', {
			val: result.meters[i].deviceGroup,
			ack: true
		});
	
		adapter.setState(pathSensor + '.did', {
			val: deviceId,
			ack: true
		});
		
		adapter.setState(pathSensor + '.timestamp', {
			val: result.meters[i].timestamp,
			ack: true
		});
				
		adapter.setState(pathSensor + '.name', {
			val: result.meters[i].name,
			ack: true
		});
		
		adapter.setState(pathSensor + '.statusValid', {
			val: result.meters[i].statusValid,
			ack: true
		});
		
		adapter.setState(pathSensor + '.deviceNumber', {
			val: deviceNumber,
			ack: true
		});
	
		adapter.setState(pathSensor + '.uid', {
			val: result.meters[i].uid,
			ack: true
		});
		
		adapter.setState(pathSensor + '.visible', {
			val: result.meters[i].visible,
			ack: true
		});
		
		if (deviceNumber === '32501812_S') {
			adapter.setState(pathSensor + '.temperature_primary', {
				val: result.meters[i].readings.temperature_primary,
				ack: true
			});
			
			adapter.setState(pathSensor + '.temperature_target', {
				val: result.meters[i].readings.temperature_target,
				ack: true
			});
		} 
		
		if (deviceNumber === '32002119' || deviceNumber == '32003164') {
			adapter.setState(pathSensor + '.contact_state', {
				val: result.meters[i].readings.contact_state,
				ack: true
			});
			
			adapter.setState(pathSensor + '.batteryStatus', {
				val: result.meters[i].batteryStatus,
				ack: true
			});
			
			if (deviceNumber == '32003164') {
				adapter.setState(pathSensor + '.batteryLow', {
					val: result.meters[i].batteryLow,
					ack: true
				});
			}
		}
		
		adapter.log.debug('Sensor states for ' + deviceId + ' written');
	}
	
	pathSensor = undefined;
	deviceTypeSensor = undefined;
}

function readSensor(link) {
    var unreach = true;
	
    request(link, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result;
            try {
                result = JSON.parse(body);
                var data = JSON.stringify(result, null, 2);
                unreach = false;
                adapter.log.debug('Homepilot Sensor data: ' + data);
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
                    createSensorStates(result, i); 
                    writeSensorStates(result, i); 
                }
            }
        } else {
            adapter.log.warn('Cannot connect to Homepilot: ' + error);
            unreach = true;
        }
        // Write connection status
        adapter.setState('station.UNREACH', {
            val: unreach,
            ack: true
        });
    }); // End request 
	
    adapter.log.debug('finished reading Homepilot Sensor Data');
}

function main() {
    adapter.subscribeStates('*'); 
    readSettings();
    adapter.log.debug('Homepilot adapter started...');
	
    callReadActuator = setInterval(function() {
        adapter.log.debug('reading homepilot JSON ...');
        readActuator('http://' + ip + '/v4/devices?devtype=Actuator');
    }, sync * 1000);
	
	callReadSensor = setInterval(function() {
        adapter.log.debug('reading homepilot sensor JSON ...');
        readSensor('http://' + ip + '/v4/devices?devtype=Sensor');
    }, 3000);
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

function getData(data, name) {
    var length = data.length;
	adapter.log.debug('chrk length=' + length);
    for (var i = 0; i < length; i += 1) {
		adapter.log.debug('chrk   data[' + i +']=' + JSON.stringify(data[i]));
        if (data[i].name == name)
            return data[i].value + '-' + data[i].timestamp;
    }
}
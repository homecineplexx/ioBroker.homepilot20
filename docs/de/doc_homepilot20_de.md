![Logo](../../admin/homepilot.png)
# ioBroker.homepilot20

## Gültigkeit
Dieser Adpter gilt ab der Version 5.0.39 des Rademacher __HomePilot 2 (9496-2)__, __HomePilot 3 (9496-3)__ und __Start2Smart Bridge__.

## Beschreibung
Dieser Adapter verbindet ioBroker mit der Rademacher Homepilot Basistation 9496 (1/2) über TCP/IP, um Rademacher DuoFern Geräte zu steuern, auf Basis der neuen RESTful API. DuoFern sendet übrigens auf 434,5 MHz.
Bei dieser neuen Version des Homepilot werden folgende Devices unterschieden:
* Actuator
* Sensor
* Camera
* Transmitter

Die als Standard eingestellte Dauer bis zur Synchronisierung der Homepilot Daten nach ioBroker beträgt 12s, allerdings nur für die Actuator Devices.
Für Sensor und Transmitter ist hartkodiert 3s eingestellt. Cameras werden momentan nicht ausgewertet. In die andere Richtung werden Befehle zeitnah ausgeführt. 

### Unterstütze Geräte
| ArtikelNummer | Produktname                                  | Notiz                      |  Datenpunkt            |   Type  |   Bereich            |   Werte    |
|:-------------:|:--------------------------------------------:|:--------------------------:|:----------------------:|:-------:|:--------------------:|:----------:|
|   32160211    |  DuoFern Wandtaster                          |                            | state                  |  9494   | Transmitter          |            |
|   32501974    |  DuoFern Mehrfachwandtaster BAT              |                            | state                  |  9494-1 | Transmitter          |            |
|   34810060    |  DuoFern Handzentrale                        |                            | state                  |  9493   | Transmitter          |            |
|   35000262    |  DuoFern Universal Aktor 2 Kanal             |                            | switch/light.switch    |  9470-2 | Actuator             | true/false |
|   35001164    |  DuoFern Zwischenstecker Schalten            |                            | switch/light.switch    |  9472   | Actuator             | true/false |
|   35000462    |  DuoFern Universal Dimmaktor UP              |                            | light.switch           |  9476   | Actuator             | 0 - 100 %  |
|   35140462    |  DuoFern UniversalDimmer                     |                            | light.switch           |  9476   | Actuator             | 0 - 100 %  |
|   32501972    |  DuoFern Mehrfachwandtaster 230V             |                            | switch/text            |  9494-2 | Actuator/Transmitter | true/false |
|   32501772    |  DuoFern Bewegungsmelder                     |                            | switch/text            |  9484   | Actuator/Sensor      | true/false |
|   35000864    |  DuoFern Connect Aktor                       |                            | level.blind            |  9477   | Actuator             | 0 - 100 %  |
|   14234511    |  DuoFern RolloTron Standard 1400/1405/1440   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   35000662    |  DuoFern Rohrmotor Aktor                     |                            | level.blind            |  9471   | Actuator             | 0 - 100 %  |
|   31500162    |  DuoFern Rohrmotorsteuerung                  |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   36500172    |  DuoFern TrollBasis                          |                            | level.blind            |  5615   | Actuator             | 0 - 100 %  |
|   27601565    |  DuoFern Rohrmotor                           |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   14236011    |  DuoFern RolloTron Pro Comfort               |                            | level.blind            |  9800   | Actuator             | 0 - 100 %  |
|   16234511    |  DuoFern RolloTron Comfort 1800/1805/1840    |                            | level.blind            |         | Actuator/Sensor      | 0 - 100 %  |
|   36500572    |  Duofern Troll Comfort                       |                            | level.blind            |  5665   | Actuator             | 0 - 100 %  |
|   45059071    |  RolloPort-SX5-DuoFern-RP-SX5DF-900N-3       |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   23602075    |  DuoFern-S-Line-Motor-Typ-SLDM-10/16-PZ      |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   23783076    |  RolloTube S-line Sun DuoFern SLDSM 30/16PZ  |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   23784076    |  RolloTube S-line Sun DuoFern SLDSM 40/16PZ  |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   23782076    |  RolloTube S-line Sun DuoFern SLDSM 50/12PZ  |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   23785076    |  RolloTube S-line Sun DuoFern SLDSM 50/12PZ  |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   32000064    |  DuoFern Umweltsensor                        |                            | level.blind/text       |  5665   | Actuator/Sensor      | 0 - 100 %  |
|   35003064    |  DuoFern Heizkörperstellantrieb              |                            | level.temperature      |  9433   | Actuator             | 4 - 28°C   |
|   32501812    |  DuoFern Raumthermostat                      |                            | level.temperature/text |  9485   | Actuator/Sensor      | 4 - 40°C   |
|   99999980    |  Philips Hue Bridge                          |                            | text                   |         | Actuator             |            |
|   99999981    |  Philips Hue Weiße Lampe                     |                            | level.dimmer           |         | Actuator             | 0 - 100 %  |
|   99999982    |  Philips Hue Ambiance Spot                   |                            | level.dimmer           |         | Actuator             | 0 - 100 %  |
|               |                                              |                            | level.color.temperature|         | Actuator             | 153 - 500  |
|   99999983    |  Philips Hue RGB Lampe                       |                            | level.dimmer           |         | Actuator             | 0 - 100 %  |
|               |                                              |                            | level.color.temperature|         | Actuator             | 153 - 500  |
|               |                                              |                            | level.rgb              |         | Actuator             |   RGB      |
|   32001664    |  DuoFern Rauchmelder                         |                            | text                   |  9481   | Sensor               |            |
|   32003164    |  DuoFern FensterTürkontakt                   |                            | text                   |  9431   | Sensor               |            |
|   32000062    |  DuoFern Funksender UP                       |                            | text                   |  9497   | Sensor               |            |
|   32000069    |  DuoFern Sonnensensor                        |                            | text                   |  9478   | Sensor               |            |
|   32480366    |  DuoFern Handsender Standard 9491            |                            | text                   |  9491   | Transmitter          |            |
|   32480361    |  DuoFern-Handsender-Standard-9491-2          |                            | text                   |  9491-2 | Transmitter          |            |
|   32501973    |  DuoFern-Wandtaster-1-Kanal-9494-3           |                            | text                   |  9494-3 | Transmitter          |            |
|   35002414    |  Z-Wave Steckdose                            |                            | switch/light.switch    |  8434   | Actuator             | true/false |
|   35002319    |  Z-Wave Heizkörperstellantrieb               |                            | level.temperature      |  8433   | Actuator             | 4 - 28°C   |
|   32002119    |  Z-Wave-FensterTürkontakt                    |                            | text                   |  8431   | Sensor               |            |
|   32004329    |  HD-Kamera                                   |                            | text                   |  9487   | Sensor               |            |
|   32004119    |  IP-Kamera                                   |                            | text                   |  9483   | Sensor               |            |
|   32004219    |  HD-Kamera (innen)                           |                            | text                   |  9486   | Sensor               |            |
|   99999998    |  GeoPilot IOS (Handy)                        |                            | text                   |         | Sensor               |            |
|   99999999    |  GeoPilot Android (Handy)                    |                            | text                   |         | Sensor               |            |
|   25782075    |  RolloTube S-line Zip DuoFern SLDZS 06/28Z   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   25782075    |  RolloTube S-line Zip DuoFern SLDZS 10/16Z   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   25782075    |  RolloTube S-line Zip DuoFern SLDZM 10/16Z   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   25782075    |  RolloTube S-line Zip DuoFern SLDZM 20/16Z   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   25782075    |  RolloTube S-line Zip DuoFern SLDZM 30/16Z   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   25782075    |  RolloTube S-line Zip DuoFern SLDZM 40/16Z   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   25782075    |  RolloTube S-line Zip DuoFern SLDZM 50/12Z   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   35144001    |  addZ White + Colour E14 LED                 |                            | level.dimmer           |         | Actuator             | 0 - 100 %  |
|               |                                              |                            | level.color.temperature|         | Actuator             | 153 - 500  |
|               |                                              |                            | level.rgb              |         | Actuator             |   RGB      |
|   32210069    |  DuoFern Sonnensensor                        |                            | text                   |  9478-1 | Sensor               |            |
|   32004464    |  DuoFern Sonnen-/Windsensor 9499             |                            | text                   |  9499   | Sensor               |            |
|   10182345    |  DuoFern-RolloTron premium smart             |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   10122345    |  DuoFern-RolloTron pure smart                |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   10236010    |  DuoFern-Rollladenmotor premium smart m10    |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   10236020    |  DuoFern-Rollladenmotor premium smart m20    |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   10236030    |  DuoFern-Rollladenmotor premium smart m30    |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   10236040    |  DuoFern-Rollladenmotor premium smart m40    |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   10234010    |  DuoFern-Rollladenmotor premium smart s10    |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   13601001    |  DuoFern-Heizkörper-Thermostat smart         |                            | level.temperature      |         | Actuator             | 4 - 28°C   |

__99999983__ , __99999982__ , __99999981__ und __35144001__ haben zusätzlich auch einen Datenpunkt __Action__ erhalten.
Hier sind folgende Werte erlaubt:
* AN/AUS
* ON/OFF

__level.blind__ hat nicht nur den Datenpunkt __Action__ sondern auch einen Datenpunkt __Position_inverted__  erhalten. 
Bei __Action__ sind folgende Werte erlaubt: 
* RAUF/UP/HOCH/REIN/IN
* RUNTER/DOWN/RAUS/OUT
* STOPP/STOP

## Szenen
Ab Version __0.0.3_ sind auch die Szenen vom Homepilot 2 abgebildet. Hier gibt es 2 Datenpunkte:
* active - hier wird nur angezeigt ob die Szene aktiv ist (true/false) und kann gegenfalls geändert werden
* execute - hier kann man durch setzen auf __true__ diese Szene ausführen lassen


## Einstellungen
### IP und Port
Die IP Adresse der Homepilot Basisstation im lokalen Netzwerk. Ohne Eingabe verwendet der Adapter __homepilot.local__. Die Portnummer ist optional und wird nur bei Eingabe einer IP-Adresse berücksichtigt.

### Synchronisation
Dauer zwischen den Abfragen der Homepilot Basistation durch ioBroker. Die Eingabe ist optional. Standard ist 12s.

### Sicherheit
Seit dieser Version des Homepilot2 gibt es auch die Möglichkeit ein lokales Passwort zu setzen, welches dann hier im Adapter ebenfalls gleich gesetzt werden muß.

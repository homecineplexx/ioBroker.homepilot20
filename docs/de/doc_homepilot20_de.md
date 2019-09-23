![Logo](../../admin/homepilot.png)
# ioBroker.homepilot20

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
| ArtikelNummer | Produktname                                | Notiz                      |  Datenpunkt            |   Type  |   Bereich            |   Werte    |
|:-------------:|:------------------------------------------:|:--------------------------:|:----------------------:|:-------:|:--------------------:|:----------:|
|   32160211    |  DuoFern-Wandtaster                        |                            | state                  |  9494   | Transmitter          |            |
|   32501974    |  DuoFern-Mehrfachwandtaster-BAT            |                            | state                  |  9494-1 | Transmitter          |            |
|   34810060    |  DuoFern-Handzentrale                      |                            | state                  |  9493   | Transmitter          |            |
|   35000262    |  DuoFern Universal-Aktor 2-Kanal           |                            | switch/light.switch    |  9470-2 | Actuator             | true/false |
|   35001164    |  DuoFern Zwischenstecker Schalten          |                            | switch/light.switch    |  9472   | Actuator             | true/false |
|   32501972    |  DuoFern Mehrfachwandtaster 230V           |                            | switch/text            |  9494-2 | Actuator/Transmitter | true/false |
|   32501772    |  DuoFern-Bewegungsmelder                   |                            | switch/text            |  9484   | Actuator/Sensor      | true/false |
|   35000864    |  DuoFern-Connect-Aktor                     |                            | level.blind            |  9477   | Actuator             | 0 - 100 %  |
|   14234511    |  DuoFern RolloTron Standard 1400/1405/1440 |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   35000662    |  DuoFern-Rohrmotor-Aktor                   |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   31500162    |  DuoFern-Rohrmotorsteuerung                |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   36500172    |  DuoFern-TrollBasis                        |                            | level.blind            |  5615   | Actuator             | 0 - 100 %  |
|   27601565    |  DuoFern-Rohrmotor                         |                            | level.blind            |         | Actuator             | 0 - 100 %  |
|   35000462    |  DuoFern Universal Dimmaktor UP            |                            | light.switch           |  9476   | Actuator             | 0 - 100 %  |
|   35140462    |  DuoFern-UniversalDimmer                   |                            | light.switch           |  9476   | Actuator             | 0 - 100 %  |
|   36500572    |  Duofern-Troll-Comfort                     |                            | level.blind            |  5665   | Actuator             | 0 - 100 %  |
|   32000064    |  DuoFern Umweltsensor                      |                            | level.blind/text       |  5665   | Actuator/Sensor      | 0 - 100 %  |
|   35003064    |  DuoFern Heizkörperstellantrieb            |                            | level.temperature      |  9433   | Actuator             | 4 - 28°C   |
|   32501812    |  DuoFern Raumthermostat                    |                            | level.temperature/text |  9485   | Actuator/Sensor      | 4 - 40°C   |
|   32001664    |  DuoFern-Rauchmelder                       |                            | text                   |  9481   | Sensor               |            |
|   32003164    |  DuoFern-FensterTürkontakt                 |                            | text                   |  9431   | Sensor               |            |
|   32000062    |  DuoFern-Funksender-UP                     |                            | text                   |  9497   | Sensor               |            |
|   35002414    |  Z-Wave Steckdose                          |                            | switch/light.switch    |  8434   | Actuator             | true/false |
|   35002319    |  Z-Wave Heizkörperstellantrieb             |                            | level.temperature      |  8433   | Actuator             | 4 - 28°C   |
|   32002119    |  Z-Wave-FensterTürkontakt                  |                            | text                   |  8431   | Sensor               |            |
|   32004329    |  HD-Kamera                                 |                            | text                   |  9487   | Sensor               |            |
|   99999998    |  GeoPilot IOS (Handy)                      |                            | text                   |         | Sensor               |            |
|   99999999    |  GeoPilot Android (Handy)                  |                            | text                   |         | Sensor               |            |
|   32000069    |  DuoFern Sonnensensor                      |                            | text                   |  9478   | Sensor               |            |


## Einstellungen
### IP und Port
Die IP Adresse der Homepilot Basisstation im lokalen Netzwerk. Ohne Eingabe verwendet der Adapter __homepilot.local__. Die Portnummer ist optional und wird nur bei Eingabe einer IP-Adresse berücksichtigt.

### Synchronisation
Dauer zwischen den Abfragen der Homepilot Basistation durch ioBroker. Die Eingabe ist optional. Standard ist 12s.

### Sicherheit
Seit dieser Version des Homepilot2 gibt es auch die Möglichkeit ein lokales Passwort zu setzen, welches dann hier im Adapter ebenfalls gleich gesetzt werden muß.
#pragma once

///
/// The xml to fill with data
/// %1 base url                   http://192.168.0.177:80/
/// %2 friendly name              Hyperion 2.0.0 (192.168.0.177)
/// %3 modelNumber                2.0.0
/// %4 serialNumber / UDN (H ID)  Fjsa723dD0....
///
/// def URN urn:schemas-upnp-org:device:Basic:1

static const QString SSDP_DESCRIPTION =	"<?xml version=\"1.0\"?>"
										"<root xmlns=\"urn:schemas-upnp-org:device-1-0\">"
											"<specVersion>"
												"<major>1</major>"
												"<minor>0</minor>"
											"</specVersion>"
											"<URLBase>%1</URLBase>"
											"<device>"
												"<deviceType>urn:schemas-upnp-org:device:Basic:1</deviceType>"
												"<friendlyName>%2</friendlyName>"
												"<manufacturer>Hyperion Open Source Ambient Lighting</manufacturer>"
												"<manufacturerURL>https://www.facebook.com/Smart.led.strip.light/</manufacturerURL>"
												"<modelDescription>Hyperion Open Source Ambient Light</modelDescription>"
												"<modelName>Hyperion</modelName>"
												"<modelNumber>%3</modelNumber>"
												"<modelURL>https://www.facebook.com/Smart.led.strip.light/</modelURL>"
												"<serialNumber>%4</serialNumber>"
												"<UDN>uuid:%4</UDN>"
												"<presentationURL>index.html</presentationURL>"
												"<iconList>"
													"<icon>"
														"<mimetype>image/png</mimetype>"
														"<height>100</height>"
														"<width>100</width>"
														"<depth>32</depth>"
														"<url>img/ambilightwifi/ssdp_icon.png</url>"
													"</icon>"
												"</iconList>"
											"</device>"
										"</root>";



[opc@instance-1 ~]$ free -m
               total        used        free      shared  buff/cache   available
Mem:             951         273         674           0         138         677
Swap:            502          61         441



[opc@instance-1 ~]$ sudo systemctl list-units --type=service --state=running
  UNIT                              LOAD   ACTIVE SUB     DESCRIPTION
  atd.service                       loaded active running Deferred execution scheduler
  auditd.service                    loaded active running Security Auditing Service
  chronyd.service                   loaded active running NTP client/server
  crond.service                     loaded active running Command Scheduler
  dbus-broker.service               loaded active running D-Bus System Message Bus
  dtprobed.service                  loaded active running DTrace USDT probe creation daemon
  firewalld.service                 loaded active running firewalld - dynamic firewall daemon
  getty@tty1.service                loaded active running Getty on tty1
  gssproxy.service                  loaded active running GSSAPI Proxy Daemon
  irqbalance.service                loaded active running irqbalance daemon
  iscsid.service                    loaded active running Open-iSCSI
  NetworkManager-dispatcher.service loaded active running Network Manager Script Dispatcher Service
  NetworkManager.service            loaded active running Network Manager
  polkit.service                    loaded active running Authorization Manager
  rpcbind.service                   loaded active running RPC Bind
  rsyslog.service                   loaded active running System Logging Service
  serial-getty@ttyS0.service        loaded active running Serial Getty on ttyS0
  sshd.service                      loaded active running OpenSSH server daemon
  systemd-journald.service          loaded active running Journal Service
  systemd-logind.service            loaded active running User Login Management
  systemd-udevd.service             loaded active running Rule-based Manager for Device Events and Files
  user@1000.service                 loaded active running User Manager for UID 1000

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.
22 loaded units listed.


[opc@instance-1 ~]$ sudo reboot


[opc@instance-1 ~]$ Free -m

               total        used        free      shared  buff/cache   available
Mem:             951         312         560           3         206         638
Swap:            502           0         502


[opc@instance-1 ~]$ sudo systemctl list-units --type=service --state=running
  UNIT                              LOAD   ACTIVE SUB     DESCRIPTION
  atd.service                       loaded active running Deferred execution scheduler
  auditd.service                    loaded active running Security Auditing Service
  chronyd.service                   loaded active running NTP client/server
  crond.service                     loaded active running Command Scheduler
  dbus-broker.service               loaded active running D-Bus System Message Bus
  dtprobed.service                  loaded active running DTrace USDT probe creation daemon
  firewalld.service                 loaded active running firewalld - dynamic firewall daemon
  getty@tty1.service                loaded active running Getty on tty1
  gssproxy.service                  loaded active running GSSAPI Proxy Daemon
  irqbalance.service                loaded active running irqbalance daemon
  NetworkManager-dispatcher.service loaded active running Network Manager Script Dispatcher Service
  NetworkManager.service            loaded active running Network Manager
  polkit.service                    loaded active running Authorization Manager
  rpcbind.service                   loaded active running RPC Bind
  rsyslog.service                   loaded active running System Logging Service
  serial-getty@ttyS0.service        loaded active running Serial Getty on ttyS0
  sshd.service                      loaded active running OpenSSH server daemon
  systemd-journald.service          loaded active running Journal Service
  systemd-logind.service            loaded active running User Login Management
  systemd-udevd.service             loaded active running Rule-based Manager for Device Events and Files
  user@1000.service                 loaded active running User Manager for UID 1000

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.
21 loaded units listed.

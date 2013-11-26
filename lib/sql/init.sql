CREATE TABLE clients(ID_client INTEGER PRIMARY KEY ASC, hostname TEXT, last_online INTEGER DEFAULT CURRENT_TIMESTAMP, os TEXT, cpu TEXT, cpu_amount INTEGER, ips TEXT, node_v TEXT, disks TEXT);

CREATE TABLE users(ID_user INTEGER PRIMARY KEY ASC, name TEXT, password TEXT, last_login INTEGER, email_threshold INTEGER, email_address TEXT, email_receiver TEXT, email_user TEXT, email_password TEXT, email_server TEXT, email_port INTEGER);

CREATE TABLE status(ID_client INTEGER, ID_status INTEGER, timestamp TIMESTAMP DEFAULT (strftime('%s', 'now')), value REAL, level INTEGER);

CREATE TABLE events(ID_client INTEGER, ID_event INTEGER, timestamp TIMESTAMP DEFAULT (strftime('%s', 'now')), status BOOL, description TEXT);

CREATE TABLE status_types(ID_status INTEGER PRIMARY KEY ASC, name TEXT, warning_threshold REAL, critical_threshold REAL);

CREATE TABLE event_types(ID_event_type INTEGER PRIMARY KEY ASC, ID_client INTEGER, name TEXT);

CREATE TABLE client_status(ID_client INTEGER, ID_status INTEGER, PRIMARY KEY(ID_client, ID_status));

CREATE TABLE event_client_type(ID_event INTEGER PRIMARY KEY ASC, ID_client INTEGER, ID_event_type INTEGER, impact_level INTEGER);

CREATE TABLE event_type_props(ID_prop INTEGER PRIMARY KEY ASC, ID_event_type INTEGER, name TEXT, type TEXT, select_values TEXT, default_value TEXT);

CREATE TABLE event_prop_values(ID_prop INTEGER, ID_event INTEGER, value TEXT, PRIMARY KEY(ID_event, ID_prop));



-- FILL tables with some sample data

INSERT INTO users(name, password, last_login, email_threshold) VALUES ("administrator", "bacon", CURRENT_TIMESTAMP, 1);

INSERT INTO status_types(name, warning_threshold, critical_threshold) VALUES
    ("cpu", 60, 90),
    ("memory", 60, 90),
    ("network", 60, 90),
    ("disk", 60, 90),
    ("socket", 100000, 470000);
ARG S6_ARCH
FROM oznu/s6-node:12.13.0-${S6_ARCH:-amd64}

RUN apk add --no-cache git python make g++ avahi-compat-libdns_sd avahi-dev dbus \
    iputils sudo nano \
  && chmod 4755 /bin/ping \
  && mkdir /mqttbridge \
  && npm set global-style=true \
  && npm set package-lock=false

ENV MQTTBRIDGE_VERSION=1.0.0
RUN npm install -g --unsafe-perm mqttbridge@${MQTTBRIDGE_VERSION}

WORKDIR /mqttbridge
VOLUME /mqttbridge

COPY root /

ARG AVAHI
RUN [ "${AVAHI:-1}" = "1" ] || (echo "Removing Avahi" && \
  rm -rf /etc/services.d/avahi \
    /etc/services.d/dbus \
    /etc/cont-init.d/40-dbus-avahi)

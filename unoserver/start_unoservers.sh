#!/bin/bash
set -e

INSTANCES=${UNOSERVER_INSTANCES:-1}
BASE_PORT=${BASE_PORT:-2003}
BASE_UNO_PORT=${BASE_UNO_PORT:-3003}

echo "Starting $INSTANCES unoserver instance(s)..."

for i in $(seq 0 $((INSTANCES - 1))); do
    PORT=$((BASE_PORT + i))
    UNO_PORT=$((BASE_UNO_PORT + i))

    echo "Starting instance $i on port $PORT (uno port $UNO_PORT)"
    python3 -m unoserver.server \
        --port="$PORT" \
        --uno-port="$UNO_PORT" \
        --interface=0.0.0.0 \
        --uno-interface=0.0.0.0 \
        --conversion-timeout=300 &

    echo "Waiting for instance $i to start..."
    until nc -z 0.0.0.0 "$PORT"; do
        sleep 1
        echo -n "."
    done
    echo " OK"
done

sleep 2
for i in $(seq 0 $((INSTANCES - 1))); do
    PORT=$((BASE_PORT + i))
    if ! nc -z 0.0.0.0 "$PORT"; then
        echo "ERROR: unoserver instance on port $PORT failed to start"
        exit 1
    fi
    echo "unoserver on port $PORT is ready"
done

echo "All unoserver instances started successfully"
wait

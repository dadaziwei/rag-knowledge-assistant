#!/bin/bash
set -e

wait_for_service() {
    local host=$1
    local port=$2
    local max_retries=${3:-30}
    local retry_interval=${4:-2}
    local retry_count=0

    echo "Waiting for $host:$port..."
    until (echo > /dev/tcp/$host/$port) >/dev/null 2>&1 || [ "$retry_count" -eq "$max_retries" ]; do
        retry_count=$((retry_count + 1))
        echo "Attempt $retry_count/$max_retries: waiting for $host:$port..."
        sleep "$retry_interval"
    done

    if [ "$retry_count" -eq "$max_retries" ]; then
        echo "Error: $host:$port did not become ready after $max_retries retries"
        exit 1
    fi

    echo "$host:$port is ready"
}

wait_for_dependencies() {
    wait_for_service mysql 3306
    wait_for_service redis 6379
    wait_for_service mongodb 27017
    wait_for_service kafka 9092
    wait_for_service minio 9000
    wait_for_service milvus-standalone 19530

    if [ "${WAIT_FOR_UNOSERVER:-false}" = "true" ]; then
        wait_for_service "${UNOSERVER_HOST:-unoserver}" "${UNOSERVER_BASE_PORTS:-2003}"
    fi

    export LOG_FILE=${LOG_FILE:-/proc/1/fd/1}
}

check_migration_needed() {
    if [ ! -f "migrations_previous/env.py" ]; then
        echo "Initializing Alembic migration environment..."
        alembic init migrations
        cp env.py migrations
        return 0
    else
        cp -r migrations_previous/ migrations/
    fi

    if ! alembic current | grep -q "head"; then
        return 0
    fi

    return 1
}

main() {
    wait_for_dependencies

    if check_migration_needed; then
        echo "Running database migrations..."
        alembic revision --autogenerate -m "Init Mysql"
        alembic upgrade head
        cp -r migrations/* migrations_previous/
    else
        echo "Database is already up to date"
    fi

    exec gunicorn -c gunicorn_config.py app.main:app
}

main

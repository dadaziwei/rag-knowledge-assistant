#!/bin/bash
set -e

: "${KAFKA_TOPIC?Environment variable KAFKA_TOPIC must be set}"
: "${KAFKA_PARTITIONS_NUMBER?Environment variable KAFKA_PARTITIONS_NUMBER must be set}"
: "${KAFKA_REPLICATION_FACTOR?Environment variable KAFKA_REPLICATION_FACTOR must be set}"

echo "Starting Kafka initialization for topic: $KAFKA_TOPIC"
echo "Target partitions: $KAFKA_PARTITIONS_NUMBER"
echo "Replication factor: $KAFKA_REPLICATION_FACTOR"

KAFKA_TOPICS_BIN="/opt/kafka/bin/kafka-topics.sh"
if [ ! -x "$KAFKA_TOPICS_BIN" ]; then
  KAFKA_TOPICS_BIN="/opt/bitnami/kafka/bin/kafka-topics.sh"
fi

if [ ! -x "$KAFKA_TOPICS_BIN" ]; then
  echo "Error: kafka-topics.sh not found" >&2
  exit 1
fi

if "$KAFKA_TOPICS_BIN" --list --bootstrap-server kafka:9092 | grep -qw "$KAFKA_TOPIC"; then
  echo "Topic $KAFKA_TOPIC exists"

  partitions=$("$KAFKA_TOPICS_BIN" \
    --bootstrap-server kafka:9092 \
    --topic "$KAFKA_TOPIC" \
    --describe \
    | grep "PartitionCount" \
    | awk -F'PartitionCount:' '{print $2}' \
    | awk '{print $1}')

  echo "Current partitions for $KAFKA_TOPIC: $partitions"

  if [ -n "$partitions" ] && [ "$partitions" -lt "$KAFKA_PARTITIONS_NUMBER" ]; then
    echo "Expanding partitions from $partitions to $KAFKA_PARTITIONS_NUMBER"
    "$KAFKA_TOPICS_BIN" --alter \
      --bootstrap-server kafka:9092 \
      --topic "$KAFKA_TOPIC" \
      --partitions "$KAFKA_PARTITIONS_NUMBER"
  else
    echo "Topic already has sufficient partitions ($partitions)"
  fi
else
  echo "Creating new topic $KAFKA_TOPIC with $KAFKA_PARTITIONS_NUMBER partitions"
  "$KAFKA_TOPICS_BIN" --create \
    --bootstrap-server kafka:9092 \
    --topic "$KAFKA_TOPIC" \
    --partitions "$KAFKA_PARTITIONS_NUMBER" \
    --replication-factor "$KAFKA_REPLICATION_FACTOR"
fi

final_partitions=$("$KAFKA_TOPICS_BIN" \
  --bootstrap-server kafka:9092 \
  --topic "$KAFKA_TOPIC" \
  --describe \
  | grep "PartitionCount" \
  | awk -F'PartitionCount:' '{print $2}' \
  | awk '{print $1}')

if [ "$final_partitions" -ne "$KAFKA_PARTITIONS_NUMBER" ]; then
  echo "Error: Failed to set partitions to $KAFKA_PARTITIONS_NUMBER. Current: $final_partitions" >&2
  exit 1
fi

echo "Kafka initialization completed successfully for topic $KAFKA_TOPIC with $final_partitions partitions"

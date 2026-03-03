#!/bin/bash
echo "⏳ Waiting for Ollama to be ready..."
until curl -sf http://localhost:11434/api/tags > /dev/null; do
  sleep 2
done
echo "✅ Ollama is up. Pulling llama3 model..."
curl -X POST http://localhost:11434/api/pull \
  -H "Content-Type: application/json" \
  -d '{"name": "llama3"}'
echo "✅ llama3 model ready"

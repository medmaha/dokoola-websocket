docker build -t dokoola-websocket .
docker run -d --name ws \
  --memory=300m --memory-swap=180m \
  -p 8080:8080 \
  dokoola-websocket
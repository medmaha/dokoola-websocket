FROM golang:1.21-alpine as builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server.go
RUN chmod +x /app/server

FROM scratch
WORKDIR /app
COPY --from=builder /app/server /server

ENV GOGC 50

EXPOSE 8080

# non-root
USER 1000  

CMD ["/server"]

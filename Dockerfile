FROM golang:1.21-alpine as builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux \
    go build -ldflags="-w -s" \
    -o server ./cmd/server.go

FROM scratch
WORKDIR /app
COPY --from=builder /app/server .

ENV GOGC 50
EXPOSE 8080

# non-root
USER 1000  

# FIX: Run it from the current directory
CMD ["./server"]

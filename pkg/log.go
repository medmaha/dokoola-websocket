package pkg

import (
	"go.uber.org/zap"
)

// Logger returns a zap.Logger for a given component, logging to stderr (unbuffered)
func Logger(component string) *zap.Logger {
	logger, err := zap.NewDevelopment()
	if err != nil {
		panic("Failed to initialize logger: " + err.Error())
	}
	
	// Add component field to all logs
	logger = logger.With(zap.String("component", component))
	defer logger.Sync() // Flush logs on exit
	return logger
}

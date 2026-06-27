# Use Node 20 Alpine for a small image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install dependencies (including dev dependencies for local dev)
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Start the app in development mode with hot reload
CMD ["npm", "run", "dev"]

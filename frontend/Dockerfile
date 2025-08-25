# Use a Node.js base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Build the frontend application
RUN npm run build

# Stage 2: Use a lightweight web server (like Nginx) to serve the static files
# This is a best practice for production
FROM nginx:alpine as production

# Copy the built files from the previous stage
COPY --from=0 /app/dist /usr/share/nginx/html

# Expose port 80 for the web server
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]
# Use the official Node.js runtime with Python support
FROM node:18-alpine

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Set the working directory in the container
WORKDIR /usr/src/app

# Create and activate virtual environment for Python packages
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy Python requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chmod 755 uploads

# Expose the port the app runs on
EXPOSE 8080

# Set environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"] 
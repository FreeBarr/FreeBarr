FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first (for layer caching)
COPY windows_requirements.txt .

# Install dependencies (excluding pywin32, which is Windows-only)
RUN pip install --no-cache-dir \
    click \
    colorama \
    Flask \
    Flask-SocketIO \
    h11 \
    itsdangerous \
    Jinja2 \
    MarkupSafe \
    python-engineio \
    python-socketio \
    simple-websocket \
    Werkzeug \
    blinker \
    python-dotenv

# Copy the entire project into the container
COPY . .

# Expose the port Flask runs on
EXPOSE 5000

# Start the app
CMD ["python", "app.py"]
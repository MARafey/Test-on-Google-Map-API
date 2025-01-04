import tkinter as tk
from tkinter import messagebox
import math
import googlemaps
import sqlite3
import folium
from folium import Marker
import webbrowser
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

CORS(app)  # Enable CORS for all routes


# Google Maps API Client (Replace with your actual API key)
gmaps = googlemaps.Client(key="AIzaSyBvbnsS-LTWjhN7ho-jEpA6sLW54KgyRfY")

# SQLite Database Connection
def create_connection():
    conn = sqlite3.connect('ride_sharing.db')
    return conn

# Create tables if they don't exist
def create_tables():
    conn = create_connection()
    cursor = conn.cursor()
    
    cursor.execute(''' 
    CREATE TABLE IF NOT EXISTS riders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        password TEXT
    )
    ''')

    cursor.execute(''' 
    CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        lat REAL,
        lng REAL
    )
    ''')

    cursor.execute(''' 
    CREATE TABLE IF NOT EXISTS rides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rider_id INTEGER,
        driver_id INTEGER,
        pickup TEXT,
        dropoff TEXT,
        cost REAL,
        FOREIGN KEY (rider_id) REFERENCES riders(id),
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )
    ''')

    conn.commit()
    conn.close()

# Insert a new rider
def signup_rider(name, email, phone, password):
    try:
        conn = create_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO riders (name, email, phone, password) VALUES (?, ?, ?, ?)', 
                       (name, email, phone, password))
        conn.commit()
        conn.close()
        return "Signup successful!"
    except sqlite3.IntegrityError:
        return "Email already exists. Please log in."

# Login a rider
def login_rider(email, password):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM riders WHERE email = ? AND password = ?', (email, password))
    rider = cursor.fetchone()
    conn.close()
    return rider

# Add sample drivers to the database
def add_sample_drivers():
    drivers = [
        ("Driver1", 31.5204, 74.3587),  # Lahore coordinates
        ("Driver2", 31.5280, 74.3580),
        ("Driver3", 31.5255, 74.3522)
    ]
    conn = create_connection()
    cursor = conn.cursor()
    cursor.executemany('INSERT INTO drivers (name, lat, lng) VALUES (?, ?, ?)', drivers)
    conn.commit()
    conn.close()

# Get all drivers from the database
def get_all_drivers():
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM drivers')
    drivers = cursor.fetchall()
    conn.close()
    return drivers

# Calculate Euclidean distance
def calculate_distance(lat1, lng1, lat2, lng2):
    return math.sqrt((lat1 - lat2)*2 + (lng1 - lng2)*2)

# Cost calculation
def calculate_cost(distance):
    base_fare = 50  # Fixed base fare
    petrol_price_per_liter = 252  # Price of petrol in currency units
    car_efficiency_km_per_liter = 10  # Car efficiency in km per liter

    # Cost per km is determined by petrol price and car efficiency
    cost_per_km = petrol_price_per_liter / car_efficiency_km_per_liter

    # Total cost = base fare + (distance in km * cost per km)
    total_cost = base_fare + (distance / 1000) * cost_per_km
    return total_cost

# Google Maps integration to get coordinates
def get_coordinates(location_name):
    geocode_result = gmaps.geocode(location_name)
    if geocode_result:
        lat = geocode_result[0]['geometry']['location']['lat']
        lng = geocode_result[0]['geometry']['location']['lng']
        return lat, lng
    return None

# Driver matching
def find_closest_driver(rider_location_name):
    rider_location = get_coordinates(rider_location_name)
    if not rider_location:
        return None

    drivers = get_all_drivers()
    min_distance = float('inf')
    closest_driver = None

    for driver in drivers:
        driver_id, name, lat, lng = driver
        distance = calculate_distance(rider_location[0], rider_location[1], lat, lng)
        if distance < min_distance:
            min_distance = distance
            closest_driver = driver

    return closest_driver

# Google Maps integration to get the shortest path between pickup and dropoff
def get_shortest_path(pickup_location, dropoff_location):
    directions_result = gmaps.directions(pickup_location, dropoff_location)
    if directions_result:
        steps = directions_result[0]['legs'][0]['steps']
        route = [step['html_instructions'] for step in steps]
        return route
    return ["No route found."]

# Plot the route on a map for the rider
def plot_ride_map(pickup_location, dropoff_location, driver_location):
    pickup_coords = get_coordinates(pickup_location)
    dropoff_coords = get_coordinates(dropoff_location)
    driver_coords = driver_location[0], driver_location[1]  # Driver's lat, lng

    # Get route between pickup and dropoff
    directions_result = gmaps.directions(pickup_location, dropoff_location)
    route_coords = [
        (step['start_location']['lat'], step['start_location']['lng'])
        for step in directions_result[0]['legs'][0]['steps']
    ]
    route_coords.append(dropoff_coords)  # Include final destination

    # Create the map centered around the pickup location
    ride_map = folium.Map(location=pickup_coords, zoom_start=12)

    # Add markers
    folium.Marker(location=pickup_coords, popup="Pickup", icon=folium.Icon(color='green')).add_to(ride_map)
    folium.Marker(location=dropoff_coords, popup="Dropoff", icon=folium.Icon(color='red')).add_to(ride_map)
    folium.Marker(location=driver_coords, popup="Driver", icon=folium.Icon(color='blue')).add_to(ride_map)

    # Add PolyLine to show the route
    folium.PolyLine(locations=route_coords, color='blue', weight=2.5, opacity=1).add_to(ride_map)

    # Save the map as an HTML file
    ride_map.save("ride_route.html")
    webbrowser.open("ride_route.html")

@app.route('/signup', methods=['POST'])
def signup():
    name = request.form['name']
    email = request.form['email']
    phone = request.form['phone']
    password = request.form['password']
    message = signup_rider(name, email, phone, password)
    return jsonify({"message": message})

@app.route('/login', methods=['POST'])
def login():
    email = request.form['email']
    password = request.form['password']
    rider = login_rider(email, password)
    if rider:
        return jsonify({"message": "Login successful!"})
    return jsonify({"message": "Invalid email or password."})

@app.route('/find_driver', methods=['POST'])
def find_driver():
    rider_location = request.form['rider_location']
    driver = find_closest_driver(rider_location)
    if driver:
        driver_id, name, lat, lng = driver
        return jsonify({"message": "Driver found!", "driver_id": driver_id, "driver_name": name})
    return jsonify({"message": "No drivers available."})

@app.route('/plot_ride', methods=['POST'])
def plot_ride():
    pickup_location = request.form['pickup_location']
    dropoff_location = request.form['dropoff_location']
    driver_id = request.form['driver_id']
    driver = get_all_drivers()[int(driver_id) - 1]
    plot_ride_map(pickup_location, dropoff_location, driver)
    return jsonify({"message": "Ride plotted!"})

if __name__ == '__main__':
    create_tables()
    add_sample_drivers()
    app.run(port=5000)
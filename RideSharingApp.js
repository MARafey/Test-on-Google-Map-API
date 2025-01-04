// RideSharingApp.js
import React, { useState } from 'react';
import { LoadScript, GoogleMap, Marker, DirectionsRenderer, Autocomplete } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyBvbnsS-LTWjhN7ho-jEpA6sLW54KgyRfY";
const libraries = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  marginTop: "1rem",
  borderRadius: "0.5rem"
};

const center = {
  lat: 31.5204,
  lng: 74.3587
};

const RideSharingApp = () => {
  const [activeView, setActiveView] = useState('login');
  const [message, setMessage] = useState('');
  const [currentDriver, setCurrentDriver] = useState(null);
  const [directions, setDirections] = useState(null);
  const [pickupAutocomplete, setPickupAutocomplete] = useState(null);
  const [dropoffAutocomplete, setDropoffAutocomplete] = useState(null);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [rideForm, setRideForm] = useState({
    pickup_location: '',
    dropoff_location: '',
    pickup_coords: null,
    dropoff_coords: null
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('email', loginForm.email);
      formData.append('password', loginForm.password);

      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',

        body: formData
      });
      const data = await response.json();
      setMessage(data.message);
      if (data.message === 'Login successful!') {
        setActiveView('ride');
      }
    } catch (error) {
      setMessage('Error connecting to server');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(signupForm).forEach(key => {
        formData.append(key, signupForm[key]);
      });

      const response = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setMessage(data.message);
      if (data.message === 'Signup successful!') {
        setActiveView('login');
      }
    } catch (error) {
      setMessage('Error connecting to server');
    }
  };

  const findDriver = async () => {
    if (!rideForm.pickup_coords || !rideForm.dropoff_coords) {
      setMessage('Please select both pickup and dropoff locations');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('rider_location', rideForm.pickup_location);

      const response = await fetch('http://localhost:5000/find_driver', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.driver_id) {
        setCurrentDriver(data);
        setMessage(`${data.driver_name} has been assigned to your ride!`);
        
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
          {
            origin: rideForm.pickup_coords,
            destination: rideForm.dropoff_coords,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              setDirections(result);
            } else {
              setMessage('Error calculating route');
            }
          }
        );
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Error connecting to server');
    }
  };

  const onPickupLoad = (autocomplete) => {
    setPickupAutocomplete(autocomplete);
  };

  const onDropoffLoad = (autocomplete) => {
    setDropoffAutocomplete(autocomplete);
  };

  const onPickupPlaceChanged = () => {
    if (pickupAutocomplete) {
      const place = pickupAutocomplete.getPlace();
      setRideForm({
        ...rideForm,
        pickup_location: place.formatted_address,
        pickup_coords: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
      });
    }
  };

  const onDropoffPlaceChanged = () => {
    if (dropoffAutocomplete) {
      const place = dropoffAutocomplete.getPlace();
      setRideForm({
        ...rideForm,
        dropoff_location: place.formatted_address,
        dropoff_coords: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
      });
    }
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <div style={{ minHeight: '100vh', padding: '2rem', backgroundColor: '#f3f4f6' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Ride Sharing App</h1>
          
          {message && (
            <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '0.25rem', marginBottom: '1rem' }}>
              {message}
            </div>
          )}
          
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button 
                onClick={() => setActiveView('login')}
                style={{ 
                  padding: '0.5rem 1rem',
                  backgroundColor: activeView === 'login' ? '#4f46e5' : '#e5e7eb',
                  color: activeView === 'login' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                Login
              </button>
              <button 
                onClick={() => setActiveView('signup')}
                style={{ 
                  padding: '0.5rem 1rem',
                  backgroundColor: activeView === 'signup' ? '#4f46e5' : '#e5e7eb',
                  color: activeView === 'signup' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                Signup
              </button>
              <button 
                onClick={() => setActiveView('ride')}
                style={{ 
                  padding: '0.5rem 1rem',
                  backgroundColor: activeView === 'ride' ? '#4f46e5' : '#e5e7eb',
                  color: activeView === 'ride' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                Book Ride
              </button>
            </div>

            {activeView === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                />
                <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                  Login
                </button>
              </form>
            )}

            {activeView === 'signup' && (
              <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  placeholder="Name"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                />
                <input
                  placeholder="Phone"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm({...signupForm, phone: e.target.value})}
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                  style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db' }}
                />
                <button type="submit" style={{ padding: '0.5rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                  Sign Up
                </button>
              </form>
            )}

            {activeView === 'ride' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Autocomplete
                  onLoad={onPickupLoad}
                  onPlaceChanged={onPickupPlaceChanged}
                >
                  <input
                    placeholder="Enter Pickup Location"
                    value={rideForm.pickup_location}
                    onChange={(e) => setRideForm({...rideForm, pickup_location: e.target.value})}
                    style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', width: '100%' }}
                  />
                </Autocomplete>

                <Autocomplete
                  onLoad={onDropoffLoad}
                  onPlaceChanged={onDropoffPlaceChanged}
                >
                  <input
                    placeholder="Enter Dropoff Location"
                    value={rideForm.dropoff_location}
                    onChange={(e) => setRideForm({...rideForm, dropoff_location: e.target.value})}
                    style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', width: '100%' }}
                  />
                </Autocomplete>

                <button 
                  onClick={findDriver}
                  style={{ padding: '0.5rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                >
                  Find Driver
                </button>

                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  zoom={13}
                  center={center}
                >
                  {rideForm.pickup_coords && (
                    <Marker
                      position={rideForm.pickup_coords}
                      icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    />
                  )}
                  {rideForm.dropoff_coords && (
                    <Marker
                      position={rideForm.dropoff_coords}
                      icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    />
                  )}
                  {currentDriver && (
                    <Marker
                      position={{ lat: 31.5204, lng: 74.3587 }}
                      icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    />
                  )}
                  {directions && (
                    <DirectionsRenderer
                      directions={directions}
                      options={{
                        suppressMarkers: true
                      }}
                    />
                  )}
                </GoogleMap>

                {currentDriver && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.25rem' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>Driver Details:</h3>
                    <p>Name: {currentDriver.driver_name}</p>
                    <p>ID: {currentDriver.driver_id}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </LoadScript>
  );
};

export { RideSharingApp };
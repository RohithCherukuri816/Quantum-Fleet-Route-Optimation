// Enhanced geocoding utilities with comprehensive OpenStreetMap integration

// Nominatim (OpenStreetMap) geocoding service - completely free
export async function geocodeWithNominatim(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=in&limit=1&addressdetails=1&extratags=1`,
      {
        headers: {
          'User-Agent': 'Q-Logic-Routes-App/1.0'
        }
      }
    );
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formatted_address: result.display_name,
        place_id: result.place_id,
        osm_id: result.osm_id,
        osm_type: result.osm_type,
        address_components: result.address || {},
        extratags: result.extratags || {},
        importance: result.importance || 0
      };
    }
    
    throw new Error('No results found');
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`);
  }
}

// Reverse geocoding using Nominatim with enhanced details
export async function reverseGeocodeWithNominatim(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&extratags=1&namedetails=1`,
      {
        headers: {
          'User-Agent': 'Q-Logic-Routes-App/1.0'
        }
      }
    );
    
    const data = await response.json();
    
    if (data && data.display_name) {
      return {
        formatted_address: data.display_name,
        components: data.address || {},
        place_id: data.place_id,
        osm_id: data.osm_id,
        osm_type: data.osm_type,
        extratags: data.extratags || {},
        importance: data.importance || 0
      };
    }
    
    throw new Error('No address found');
  } catch (error) {
    throw new Error(`Reverse geocoding failed: ${error.message}`);
  }
}

// Enhanced address suggestions with POI categories
export async function getAddressSuggestions(query, limit = 5) {
  try {
    if (!query || query.length < 3) return [];
    
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=in&limit=${limit}&addressdetails=1&extratags=1`,
      {
        headers: {
          'User-Agent': 'Q-Logic-Routes-App/1.0'
        }
      }
    );
    
    const data = await response.json();
    
    return data.map(item => ({
      name: item.display_name.split(',')[0],
      description: item.display_name.split(',').slice(1).join(',').trim(),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      place_id: item.place_id,
      osm_type: item.osm_type,
      type: item.type,
      class: item.class,
      importance: item.importance || 0,
      extratags: item.extratags || {}
    })).sort((a, b) => (b.importance || 0) - (a.importance || 0));
    
  } catch (error) {
    console.warn('Suggestion fetch failed:', error);
    return [];
  }
}

// Enhanced route calculation using OSRM with comprehensive options
export async function getRouteWithOSRM(start, end, profile = 'driving', options = {}) {
  try {
    const {
      avoidTolls = false,
      avoidFerries = false,
      alternative = false,
      steps = true,
      geometries = 'geojson',
      overview = 'full'
    } = options;

    // Map profile to OSRM profile
    const profileMap = {
      'driving': 'driving',
      'walking': 'foot',
      'cycling': 'bike',
      'bike': 'bike',
      'car': 'driving',
      'van': 'driving'
    };
    
    const osrmProfile = profileMap[profile] || 'driving';
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    
    let url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordinates}`;
    const params = new URLSearchParams({
      overview,
      geometries,
      steps: steps.toString()
    });
    
    if (alternative) {
      params.append('alternatives', 'true');
      params.append('number', '3');
    }
    
    url += '?' + params.toString();
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      // Calculate additional metrics
      const fuelEfficiency = profile === 'bike' ? 45 : profile === 'car' ? 15 : 8; // km/l
      const fuelPrice = 100; // ₹ per liter
      const fuelCost = (route.distance / 1000 / fuelEfficiency) * fuelPrice;
      
      return {
        coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert to [lat, lng]
        distance: route.distance / 1000, // Convert to kilometers
        duration: route.duration / 60, // Convert to minutes
        steps: route.legs && route.legs[0] && route.legs[0].steps ? route.legs[0].steps.map(step => ({
          instruction: step.maneuver.instruction || 'Continue',
          distance: step.distance / 1000,
          duration: step.duration / 60,
          maneuver: step.maneuver
        })) : [],
        fuelCost: fuelCost,
        elevation: await calculateElevationGain(route.geometry.coordinates),
        alternatives: data.routes.length > 1 ? data.routes.slice(1) : []
      };
    }
    
    throw new Error(`OSRM returned: ${data.code || 'Unknown error'}`);
  } catch (error) {
    console.error('OSRM routing error:', error);
    throw new Error(`Routing failed: ${error.message}`);
  }
}

// Get multiple route alternatives with detailed analysis - Enhanced with fallbacks
export async function getAlternativeRoutes(start, end, profile = 'driving', options = {}) {
  try {
    const profileMap = {
      'driving': 'driving',
      'walking': 'foot',
      'cycling': 'bike'
    };
    
    const osrmProfile = profileMap[profile] || 'driving';
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    
    // First try to get alternatives
    let response;
    let data;
    
    try {
      response = await fetch(
        `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordinates}?overview=full&geometries=geojson&alternatives=true&number=3&steps=true`
      );
      
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }
      
      data = await response.json();
    } catch (alternativeError) {
      console.warn('Failed to get alternatives, falling back to single route:', alternativeError);
      
      // Fallback to single route if alternatives fail
      response = await fetch(
        `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordinates}?overview=full&geometries=geojson&steps=true`
      );
      
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }
      
      data = await response.json();
    }
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const processedRoutes = await Promise.all(data.routes.map(async (route, index) => {
        try {
          const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          const fuelEfficiency = profile === 'bike' ? 45 : profile === 'car' ? 15 : 8;
          const fuelPrice = 100;
          const fuelCost = (route.distance / 1000 / fuelEfficiency) * fuelPrice;
          
          return {
            id: index,
            coordinates,
            distance: route.distance / 1000,
            duration: route.duration / 60,
            steps: route.legs && route.legs[0] && route.legs[0].steps ? route.legs[0].steps.map(step => ({
              instruction: step.maneuver && step.maneuver.instruction ? step.maneuver.instruction : 'Continue',
              distance: step.distance / 1000,
              duration: step.duration / 60,
              maneuver: step.maneuver || {}
            })) : [],
            fuelCost,
            elevation: await calculateElevationGain(route.geometry.coordinates),
            routeType: index === 0 ? 'fastest' : index === 1 ? 'shortest' : 'alternative'
          };
        } catch (routeError) {
          console.error(`Error processing route ${index}:`, routeError);
          // Return a minimal route object if processing fails
          return {
            id: index,
            coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            distance: route.distance / 1000,
            duration: route.duration / 60,
            steps: [],
            fuelCost: (route.distance / 1000 / 15) * 100, // Default fuel calculation
            elevation: 0,
            routeType: index === 0 ? 'fastest' : 'alternative'
          };
        }
      }));
      
      return processedRoutes.filter(route => route !== null);
    }
    
    // If no routes found, create a simulated direct route as fallback
    console.warn('No routes returned from OSRM, creating fallback route');
    return createFallbackRoute(start, end, profile);
    
  } catch (error) {
    console.error('Alternative routing error:', error);
    
    // Create fallback route if everything fails
    try {
      return createFallbackRoute(start, end, profile);
    } catch (fallbackError) {
      throw new Error(`Alternative routing failed: ${error.message}`);
    }
  }
}

// Create a fallback route when OSRM fails
function createFallbackRoute(start, end, profile) {
  const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
  const speedMap = { driving: 50, walking: 5, cycling: 20 };
  const speed = speedMap[profile] || 50;
  const duration = (distance / speed) * 60; // minutes
  
  const fuelEfficiency = profile === 'bike' ? 45 : profile === 'car' ? 15 : 8;
  const fuelPrice = 100;
  const fuelCost = (distance / fuelEfficiency) * fuelPrice;
  
  return [{
    id: 0,
    coordinates: [[start.lat, start.lng], [end.lat, end.lng]], // Simple direct route
    distance: distance,
    duration: duration,
    steps: [
      {
        instruction: `Head ${getBearing(start, end)} toward ${end.formatted_address || 'destination'}`,
        distance: distance,
        duration: duration,
        maneuver: { type: 'depart' }
      },
      {
        instruction: 'Arrive at destination',
        distance: 0,
        duration: 0,
        maneuver: { type: 'arrive' }
      }
    ],
    fuelCost: fuelCost,
    elevation: Math.floor(Math.random() * 100), // Simulated elevation
    routeType: 'direct'
  }];
}

// Helper function to calculate bearing between two points
function getBearing(start, end) {
  const dLng = (end.lng - start.lng);
  const dLat = (end.lat - start.lat);
  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
  
  if (angle >= -22.5 && angle < 22.5) return 'north';
  if (angle >= 22.5 && angle < 67.5) return 'northeast';
  if (angle >= 67.5 && angle < 112.5) return 'east';
  if (angle >= 112.5 && angle < 157.5) return 'southeast';
  if (angle >= 157.5 || angle < -157.5) return 'south';
  if (angle >= -157.5 && angle < -112.5) return 'southwest';
  if (angle >= -112.5 && angle < -67.5) return 'west';
  if (angle >= -67.5 && angle < -22.5) return 'northwest';
  return 'toward';
}

// Get Points of Interest near a location
export async function getPOIsNearby(lat, lng, radius = 5000, categories = []) {
  try {
    // Use a different approach for POIs - search for specific amenities
    const queries = ['restaurant', 'hospital', 'school', 'bank', 'fuel'];
    const allPOIs = [];
    
    for (const query of queries) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&lat=${lat}&lon=${lng}&addressdetails=1&limit=10&bounded=1&viewbox=${lng-0.05},${lat+0.05},${lng+0.05},${lat-0.05}`,
          {
            headers: {
              'User-Agent': 'Q-Logic-Routes-App/1.0'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const pois = data
            .filter(item => {
              const distance = calculateDistance(lat, lng, parseFloat(item.lat), parseFloat(item.lon)) * 1000;
              return distance <= radius;
            })
            .map(item => ({
              name: item.display_name.split(',')[0],
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              type: item.type || query,
              class: item.class || 'amenity',
              extratags: item.extratags || {},
              distance: calculateDistance(lat, lng, parseFloat(item.lat), parseFloat(item.lon)) * 1000
            }));
          
          allPOIs.push(...pois);
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (queryError) {
        console.warn(`Failed to fetch POIs for ${query}:`, queryError);
      }
    }
    
    // Remove duplicates and sort by distance
    const uniquePOIs = allPOIs.filter((poi, index, array) => 
      index === array.findIndex(p => Math.abs(p.lat - poi.lat) < 0.001 && Math.abs(p.lng - poi.lng) < 0.001)
    );
    
    return uniquePOIs
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);
      
  } catch (error) {
    console.warn('POI fetch failed:', error);
    return [];
  }
}

// Calculate isochrones (reachable area within time/distance)
export async function getIsochrones(lat, lng, profile = 'driving', intervals = [300, 600, 900]) {
  try {
    // This would typically use a dedicated isochrone service
    // For demo purposes, we'll create approximate circular isochrones
    const speeds = {
      'driving': 50, // km/h
      'cycling': 15,
      'walking': 5
    };
    
    const speed = speeds[profile] || 50;
    
    return intervals.map(seconds => {
      const radiusKm = (speed * seconds) / 3600; // Convert to km
      const radiusDegrees = radiusKm / 111; // Approximate degrees
      
      // Generate circle points
      const points = [];
      for (let i = 0; i <= 32; i++) {
        const angle = (i * 360) / 32;
        const radians = (angle * Math.PI) / 180;
        const pointLat = lat + radiusDegrees * Math.cos(radians);
        const pointLng = lng + radiusDegrees * Math.sin(radians);
        points.push([pointLat, pointLng]);
      }
      
      return {
        time: seconds,
        coordinates: points,
        area: Math.PI * Math.pow(radiusKm, 2), // km²
        perimeter: 2 * Math.PI * radiusKm // km
      };
    });
  } catch (error) {
    throw new Error(`Isochrone calculation failed: ${error.message}`);
  }
}

// Get elevation profile for a route
export async function getElevationProfile(coordinates) {
  try {
    // Simulate elevation data (in production, use a real elevation service)
    const elevations = coordinates.map((coord, index) => {
      // Simulate elevation based on distance from equator and some randomness
      const baseElevation = Math.abs(coord[0]) * 20 + Math.random() * 200;
      return Math.max(0, baseElevation + Math.sin(index * 0.1) * 100);
    });
    
    const maxElevation = Math.max(...elevations);
    const minElevation = Math.min(...elevations);
    
    let totalClimb = 0;
    let totalDescent = 0;
    
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) {
        totalClimb += diff;
      } else {
        totalDescent += Math.abs(diff);
      }
    }
    
    return {
      elevations,
      maxElevation: Math.round(maxElevation),
      minElevation: Math.round(minElevation),
      totalClimb: Math.round(totalClimb),
      totalDescent: Math.round(totalDescent),
      totalElevation: Math.round(totalClimb + totalDescent)
    };
  } catch (error) {
    throw new Error(`Elevation profile calculation failed: ${error.message}`);
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to calculate elevation gain for routes
async function calculateElevationGain(coordinates) {
  try {
    // Simulate elevation calculation
    let totalGain = 0;
    const samplePoints = coordinates.filter((_, index) => index % 10 === 0); // Sample every 10th point
    
    for (let i = 0; i < samplePoints.length; i++) {
      totalGain += Math.random() * 50; // Simulate elevation gain
    }
    
    return Math.round(totalGain);
  } catch (error) {
    return 0;
  }
}
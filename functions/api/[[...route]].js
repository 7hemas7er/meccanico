// Cloudflare Pages Functions API Handler
// Vehicle Maintenance Application

// Utility functions
function parseCookies(cookieHeader) {
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = decodeURIComponent(value);
            }
        });
    }
    return cookies;
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function verifyPassword(password, hash) {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}

// JWT utilities
async function createJWT(payload, secret, expiresIn = 86400) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    
    const jwtPayload = {
        ...payload,
        iat: now,
        exp: now + expiresIn
    };
    
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '');
    const data = `${encodedHeader}.${encodedPayload}`;
    
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');
    
    return `${data}.${encodedSignature}`;
}

async function verifyJWT(token, secret) {
    try {
        const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
        
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        
        const data = `${encodedHeader}.${encodedPayload}`;
        const signature = Uint8Array.from(atob(encodedSignature + '=='), c => c.charCodeAt(0));
        
        const valid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(data));
        
        if (!valid) {
            throw new Error('Invalid signature');
        }
        
        const payload = JSON.parse(atob(encodedPayload + '=='));
        
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            throw new Error('Token expired');
        }
        
        return payload;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

// Authentication middleware
async function authenticateUser(request, env) {
    const cookieHeader = request.headers.get('Cookie');
    const cookies = parseCookies(cookieHeader);
    const token = cookies.access_token;
    
    if (!token) {
        throw new Error('No authentication token');
    }
    
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    const { results } = await env.DB.prepare(
        'SELECT * FROM users WHERE username = ? AND is_active = 1'
    ).bind(payload.sub).all();
    
    const user = results[0];
    if (!user) {
        throw new Error('User not found or inactive');
    }
    
    return user;
}

// API Route handlers
const routes = {
    // Authentication
    'POST /api/token': async (request, env) => {
        const formData = await request.formData();
        const username = formData.get('username');
        const password = formData.get('password');
        
        if (!username || !password) {
            return new Response(JSON.stringify({ detail: 'Username and password required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const { results } = await env.DB.prepare(
            'SELECT * FROM users WHERE username = ? AND is_active = 1'
        ).bind(username).all();
        
        const user = results[0];
        if (!user || !(await verifyPassword(password, user.password_hash))) {
            return new Response(JSON.stringify({ detail: 'Incorrect username or password' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Update last login
        await env.DB.prepare(
            'UPDATE users SET last_login = ? WHERE id = ?'
        ).bind(new Date().toISOString(), user.id).run();
        
        // Create JWT
        const token = await createJWT({ sub: user.username }, env.JWT_SECRET);
        
        const response = new Response(JSON.stringify({
            access_token: token,
            token_type: 'bearer'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
        // Set HTTP-only cookie
        response.headers.set('Set-Cookie', 
            `access_token=${token}; HttpOnly; SameSite=Lax; Max-Age=86400; Path=/; Secure`
        );
        
        return response;
    },

    // Get current user
    'GET /api/user': async (request, env) => {
        const user = await authenticateUser(request, env);
        return new Response(JSON.stringify({
            username: user.username,
            role: user.role,
            is_active: !!user.is_active,
            created_at: user.created_at,
            last_login: user.last_login
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    // Get vehicles
    'GET /api/vehicles/': async (request, env) => {
        await authenticateUser(request, env);
        
        const { results } = await env.DB.prepare(`
            SELECT v.id, v.license_plate, v.last_update,
                   json_group_array(
                       CASE 
                       WHEN a.id IS NOT NULL THEN 
                           json_object(
                               'id', a.id,
                               'activity', a.activity,
                               'kilometers', a.kilometers,
                               'date', a.date
                           )
                       ELSE NULL
                       END
                   ) as activities
            FROM vehicles v
            LEFT JOIN activities a ON v.id = a.vehicle_id
            GROUP BY v.id, v.license_plate, v.last_update
            ORDER BY v.last_update DESC
        `).all();
        
        const vehicles = results.map(vehicle => ({
            ...vehicle,
            activities: JSON.parse(vehicle.activities).filter(a => a !== null) || []
        }));
        
        return new Response(JSON.stringify(vehicles), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    // Create vehicle
    'POST /api/vehicle': async (request, env) => {
        await authenticateUser(request, env);
        
        const { license_plate } = await request.json();
        
        if (!license_plate) {
            return new Response(JSON.stringify({ detail: 'License plate is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const vehicleId = crypto.randomUUID();
        
        try {
            await env.DB.prepare(
                'INSERT INTO vehicles (id, license_plate) VALUES (?, ?)'
            ).bind(vehicleId, license_plate).run();
            
            return new Response(JSON.stringify({
                id: vehicleId,
                license_plate,
                activities: []
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                return new Response(JSON.stringify({ detail: 'License plate already exists' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            throw error;
        }
    },

    // Get maintenance types
    'GET /api/maintenance-types': async (request, env) => {
        await authenticateUser(request, env);
        
        const { results } = await env.DB.prepare(
            'SELECT * FROM maintenance_types ORDER BY name'
        ).all();
        
        return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    // Logout
    'POST /api/logout': async (request, env) => {
        const response = new Response(JSON.stringify({ status: 'success' }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
        response.headers.set('Set-Cookie', 
            'access_token=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure'
        );
        
        return response;
    }
};

// Main request handler
export async function onRequest(context) {
    const { request, env } = context;
    
    // Initialize database on first request if needed
    try {
        const { results } = await env.DB.prepare('SELECT COUNT(*) as count FROM users').all();
        if (results[0].count === 0) {
            // Create default admin user
            const adminPassword = await hashPassword(env.ADMIN_PASSWORD || 'password123');
            await env.DB.prepare(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
            ).bind(env.ADMIN_USERNAME || 'admin', adminPassword, 'admin').run();
        }
    } catch (error) {
        console.log('Database initialization may be needed:', error.message);
    }
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
            }
        });
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const routeKey = `${method} ${path}`;
    
    // Add CORS headers to all responses
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
    };
    
    try {
        const handler = routes[routeKey];
        
        if (!handler) {
            return new Response(JSON.stringify({ detail: 'Not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        const response = await handler(request, env);
        
        // Add CORS headers to response
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        
        return response;
        
    } catch (error) {
        console.error('API Error:', error);
        
        let status = 500;
        let message = 'Internal server error';
        
        if (error.message.includes('No authentication token') || 
            error.message.includes('Invalid token') || 
            error.message.includes('User not found')) {
            status = 401;
            message = 'Unauthorized';
        }
        
        return new Response(JSON.stringify({ detail: message }), {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
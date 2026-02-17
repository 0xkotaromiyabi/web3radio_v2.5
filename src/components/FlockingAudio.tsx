import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { AppKitButton } from "@reown/appkit/react";

/* TEXTURE WIDTH FOR SIMULATION */
const WIDTH = 32;
const BIRDS = WIDTH * WIDTH;

// Custom Geometry - using 3 triangles each. No UVs, no normals currently.
function createBirdGeometry() {
    const geometry = new THREE.BufferGeometry();
    const trianglesPerBird = 3;
    const triangles = BIRDS * trianglesPerBird;
    const points = triangles * 3;

    const vertices = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
    const birdColors = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
    const references = new THREE.BufferAttribute(new Float32Array(points * 2), 2);
    const birdVertex = new THREE.BufferAttribute(new Float32Array(points), 1);

    geometry.setAttribute("position", vertices);
    geometry.setAttribute("birdColor", birdColors);
    geometry.setAttribute("reference", references);
    geometry.setAttribute("birdVertex", birdVertex);

    let v = 0;
    const wingsSpan = 20;

    for (let f = 0; f < BIRDS; f++) {
        // Body
        vertices.array[v++] = 0; vertices.array[v++] = 0; vertices.array[v++] = -20;
        vertices.array[v++] = 0; vertices.array[v++] = 4; vertices.array[v++] = -20;
        vertices.array[v++] = 0; vertices.array[v++] = 0; vertices.array[v++] = 30;

        // Wings
        vertices.array[v++] = 0; vertices.array[v++] = 0; vertices.array[v++] = -15;
        vertices.array[v++] = -wingsSpan; vertices.array[v++] = 0; vertices.array[v++] = 0;
        vertices.array[v++] = 0; vertices.array[v++] = 0; vertices.array[v++] = 15;

        vertices.array[v++] = 0; vertices.array[v++] = 0; vertices.array[v++] = 15;
        vertices.array[v++] = wingsSpan; vertices.array[v++] = 0; vertices.array[v++] = 0;
        vertices.array[v++] = 0; vertices.array[v++] = 0; vertices.array[v++] = -15;
    }

    for (let i = 0; i < triangles * 3; i++) {
        const triangleIndex = Math.floor(i / 3);
        const birdIndex = Math.floor(triangleIndex / trianglesPerBird);
        const x = (birdIndex % WIDTH) / WIDTH;
        const y = Math.floor(birdIndex / WIDTH) / WIDTH;

        const c = new THREE.Color(
            0x666666 + Math.floor(i / 9) / BIRDS * 0x666666
        );

        birdColors.array[i * 3 + 0] = c.r;
        birdColors.array[i * 3 + 1] = c.g;
        birdColors.array[i * 3 + 2] = c.b;

        references.array[i * 2] = x;
        references.array[i * 2 + 1] = y;

        birdVertex.array[i] = i % 9;
    }

    geometry.scale(0.2, 0.2, 0.2);
    return geometry;
}

const fragmentShaderPosition = `
    uniform float time;
    uniform float delta;

    void main()	{
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 tmpPos = texture2D( texturePosition, uv );
        vec3 position = tmpPos.xyz;
        vec3 velocity = texture2D( textureVelocity, uv ).xyz;

        float phase = tmpPos.w;

        phase = mod( ( phase + delta +
            length( velocity.xz ) * delta * 3. +
            max( velocity.y, 0.0 ) * delta * 6. ), 62.83 );

        gl_FragColor = vec4( position + velocity * delta * 15. , phase );
    }
`;

const fragmentShaderVelocity = `
    uniform float time;
    uniform float testing;
    uniform float delta; // about 0.016
    uniform float separationDistance; // 20
    uniform float alignmentDistance; // 40
    uniform float cohesionDistance; //
    uniform float freedomFactor;
    uniform vec3 predator;

    const float width = resolution.x;
    const float height = resolution.y;

    const float PI = 3.141592653589793;
    const float PI_2 = PI * 2.0;

    float zoneRadius = 40.0;
    float zoneRadiusSquared = 1600.0;

    float separationThresh = 0.45;
    float alignmentThresh = 0.65;

    const float UPPER_BOUNDS = BOUNDS;
    const float LOWER_BOUNDS = -UPPER_BOUNDS;

    const float SPEED_LIMIT = 9.0;

    float rand( vec2 co ){
        return fract( sin( dot( co.xy, vec2(12.9898,78.233) ) ) * 43758.5453 );
    }

    void main() {
        zoneRadius = separationDistance + alignmentDistance + cohesionDistance;
        separationThresh = separationDistance / zoneRadius;
        alignmentThresh = ( separationDistance + alignmentDistance ) / zoneRadius;
        zoneRadiusSquared = zoneRadius * zoneRadius;

        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec3 birdPosition, birdVelocity;

        vec3 selfPosition = texture2D( texturePosition, uv ).xyz;
        vec3 selfVelocity = texture2D( textureVelocity, uv ).xyz;

        float dist;
        vec3 dir; // direction
        float distSquared;

        float separationSquared = separationDistance * separationDistance;
        float cohesionSquared = cohesionDistance * cohesionDistance;

        float f;
        float percent;

        vec3 velocity = selfVelocity;

        float limit = SPEED_LIMIT;

        dir = predator * UPPER_BOUNDS - selfPosition;
        dir.z = 0.;
        dist = length( dir );
        distSquared = dist * dist;

        float preyRadius = 150.0;
        float preyRadiusSq = preyRadius * preyRadius;

        // move birds away from predator
        if ( dist < preyRadius ) {
            f = ( distSquared / preyRadiusSq - 1.0 ) * delta * 100.;
            velocity += normalize( dir ) * f;
            limit += 5.0;
        }

        // Attract flocks to the center
        vec3 central = vec3( 0., 0., 0. );
        dir = selfPosition - central;
        dist = length( dir );

        dir.y *= 2.5;
        velocity -= normalize( dir ) * delta * 5.;

        for ( float y = 0.0; y < height; y++ ) {
            for ( float x = 0.0; x < width; x++ ) {
                vec2 ref = vec2( x + 0.5, y + 0.5 ) / resolution.xy;
                birdPosition = texture2D( texturePosition, ref ).xyz;

                dir = birdPosition - selfPosition;
                dist = length( dir );

                if ( dist < 0.0001 ) continue;

                distSquared = dist * dist;

                if ( distSquared > zoneRadiusSquared ) continue;

                percent = distSquared / zoneRadiusSquared;

                if ( percent < separationThresh ) { // low
                    // Separation - Move apart for comfort
                    f = ( separationThresh / percent - 1.0 ) * delta;
                    velocity -= normalize( dir ) * f;
                } else if ( percent < alignmentThresh ) { // high
                    // Alignment - fly the same direction
                    float threshDelta = alignmentThresh - separationThresh;
                    float adjustedPercent = ( percent - separationThresh ) / threshDelta;

                    birdVelocity = texture2D( textureVelocity, ref ).xyz;

                    f = ( 0.5 - cos( adjustedPercent * PI_2 ) * 0.5 + 0.5 ) * delta;
                    velocity += normalize( birdVelocity ) * f;
                } else {
                    // Attraction / Cohesion - move closer
                    float threshDelta = 1.0 - alignmentThresh;
                    float adjustedPercent;
                    if( threshDelta == 0. ) adjustedPercent = 1.;
                    else adjustedPercent = ( percent - alignmentThresh ) / threshDelta;

                    f = ( 0.5 - ( cos( adjustedPercent * PI_2 ) * -0.5 + 0.5 ) ) * delta;
                    velocity += normalize( dir ) * f;
                }
            }
        }

        // Speed Limits
        if ( length( velocity ) > limit ) {
            velocity = normalize( velocity ) * limit;
        }

        gl_FragColor = vec4( velocity, 1.0 );
    }
`;

const birdVS = `
    attribute vec2 reference;
    attribute float birdVertex;
    attribute vec3 birdColor;

    uniform sampler2D texturePosition;
    uniform sampler2D textureVelocity;

    varying vec4 vColor;
    varying float z;

    uniform float time;

    void main() {
        vec4 tmpPos = texture2D( texturePosition, reference );
        vec3 pos = tmpPos.xyz;
        vec3 velocity = normalize(texture2D( textureVelocity, reference ).xyz);

        vec3 newPosition = position;

        if ( birdVertex == 4.0 || birdVertex == 7.0 ) {
            // flap wings
            newPosition.y = sin( tmpPos.w ) * 5.;
        }

        newPosition = mat3( modelMatrix ) * newPosition;

        velocity.z *= -1.;
        float xz = length( velocity.xz );
        float xyz = 1.;
        float x = sqrt( 1. - velocity.y * velocity.y );

        float cosry = velocity.x / xz;
        float sinry = velocity.z / xz;

        float cosrz = x / xyz;
        float sinrz = velocity.y / xyz;

        mat3 maty =  mat3(
            cosry, 0, -sinry,
            0    , 1, 0     ,
            sinry, 0, cosry
        );

        mat3 matz =  mat3(
            cosrz , sinrz, 0,
            -sinrz, cosrz, 0,
            0     , 0    , 1
        );

        newPosition =  maty * matz * newPosition;
        newPosition += pos;

        z = newPosition.z;

        vColor = vec4( birdColor, 1.0 );
        gl_Position = projectionMatrix *  viewMatrix  * vec4( newPosition, 1.0 );
    }
`;

const birdFS = `
    varying vec4 vColor;
    varying float z;

    uniform vec3 color;

    void main() {
        // Mix vertex color with the dynamic uniform color
        float z2 = 0.2 + ( 1000. - z ) / 1000. * vColor.x;
        gl_FragColor = vec4( color * z2, 1. );
    }
`;

function getSkyColor() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 7) {
        return new THREE.Color("#FF8C42"); // dawn
    }
    if (hour >= 7 && hour < 12) {
        return new THREE.Color("#87CEEB"); // pagi
    }
    if (hour >= 12 && hour < 16) {
        return new THREE.Color("#4FC3F7"); // siang
    }
    if (hour >= 16 && hour < 18) {
        return new THREE.Color("#FF7043"); // sunset
    }
    if (hour >= 18 && hour < 22) {
        return new THREE.Color("#1A237E"); // malam awal
    }

    return new THREE.Color("#000011"); // midnight
}

export default function FlockingAudio() {
    const mountRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const animationRef = useRef<number>(undefined);

    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [metadata, setMetadata] = useState({
        title: "Web3 Radio",
        artist: "3D Flocking Birds Stream",
        artwork: "https://webthreeradio.xyz/assets/web3radio-logo.png"
    });

    const fetchMetadata = useCallback(async () => {
        try {
            const response = await fetch("https://webthreeradio.xyz/api/stream-metadata/web3");
            const data = await response.json();
            if (data && data.nowPlaying) {
                const title = data.nowPlaying.title || "Web3 Radio";
                const artist = data.nowPlaying.artist || "Decentralized Radio Station";
                const artwork = data.nowPlaying.artwork || "https://webthreeradio.xyz/assets/web3radio-logo.png";

                setMetadata(prev => {
                    if (prev.title === title && prev.artist === artist && prev.artwork === artwork) return prev;
                    return { title, artist, artwork };
                });
            }
        } catch (error) {
            console.error("Error fetching metadata:", error);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchMetadata();
        const interval = setInterval(fetchMetadata, 30000);
        return () => clearInterval(interval);
    }, [fetchMetadata]);

    useEffect(() => {
        if (!mountRef.current) return;

        const BOUNDS = 800, BOUNDS_HALF = BOUNDS / 2;
        const mount = mountRef.current;

        // ======================
        // SCENE
        // ======================
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        scene.fog = new THREE.Fog(0xffffff, 100, 1000);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
        camera.position.z = 350;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        mount.appendChild(renderer.domElement);

        // ======================
        // AUDIO SETUP
        // ======================
        const audio = new Audio("https://shoutcast.webthreeradio.xyz/stream");
        audio.crossOrigin = "anonymous";
        audio.loop = true;
        audioRef.current = audio;

        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaElementSource(audio);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        function getEnergy() {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            return sum / dataArray.length / 255;
        }

        // ======================
        // GPGPU SETUP
        // ======================
        const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

        const dtPosition = gpuCompute.createTexture();
        const dtVelocity = gpuCompute.createTexture();

        // Fill position texture
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const posArray = (dtPosition.image as any).data;
        for (let k = 0, kl = posArray.length; k < kl; k += 4) {
            posArray[k + 0] = Math.random() * BOUNDS - BOUNDS_HALF;
            posArray[k + 1] = Math.random() * BOUNDS - BOUNDS_HALF;
            posArray[k + 2] = Math.random() * BOUNDS - BOUNDS_HALF;
            posArray[k + 3] = 1;
        }

        // Fill velocity texture
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const velArray = (dtVelocity.image as any).data;
        for (let k = 0, kl = velArray.length; k < kl; k += 4) {
            velArray[k + 0] = (Math.random() - 0.5) * 10;
            velArray[k + 1] = (Math.random() - 0.5) * 10;
            velArray[k + 2] = (Math.random() - 0.5) * 10;
            velArray[k + 3] = 1;
        }

        const velocityVariable = gpuCompute.addVariable("textureVelocity", fragmentShaderVelocity, dtVelocity);
        const positionVariable = gpuCompute.addVariable("texturePosition", fragmentShaderPosition, dtPosition);

        gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);
        gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);

        const positionUniforms = positionVariable.material.uniforms;
        const velocityUniforms = velocityVariable.material.uniforms;

        positionUniforms["time"] = { value: 0.0 };
        positionUniforms["delta"] = { value: 0.0 };
        velocityUniforms["time"] = { value: 1.0 };
        velocityUniforms["delta"] = { value: 0.0 };
        velocityUniforms["testing"] = { value: 1.0 };
        velocityUniforms["separationDistance"] = { value: 20.0 };
        velocityUniforms["alignmentDistance"] = { value: 20.0 };
        velocityUniforms["cohesionDistance"] = { value: 20.0 };
        velocityUniforms["freedomFactor"] = { value: 0.75 };
        velocityUniforms["predator"] = { value: new THREE.Vector3() };
        velocityVariable.material.defines.BOUNDS = BOUNDS.toFixed(2);

        velocityVariable.wrapS = THREE.RepeatWrapping;
        velocityVariable.wrapT = THREE.RepeatWrapping;
        positionVariable.wrapS = THREE.RepeatWrapping;
        positionVariable.wrapT = THREE.RepeatWrapping;

        const error = gpuCompute.init();
        if (error !== null) console.error(error);

        // ======================
        // BIRD MESH
        // ======================
        const geometry = createBirdGeometry();
        const birdUniforms = {
            "color": { value: new THREE.Color(0xff2200) },
            "texturePosition": { value: null as THREE.Texture | null },
            "textureVelocity": { value: null as THREE.Texture | null },
            "time": { value: 1.0 },
            "delta": { value: 0.0 }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: birdUniforms,
            vertexShader: birdVS,
            fragmentShader: birdFS,
            side: THREE.DoubleSide
        });

        const birdMesh = new THREE.Mesh(geometry, material);
        birdMesh.rotation.y = Math.PI / 2;
        birdMesh.matrixAutoUpdate = false;
        birdMesh.updateMatrix();
        scene.add(birdMesh);

        // ======================
        // MOUSE / PREDATOR
        // ======================
        let mouseX = 10000, mouseY = 10000;
        const onPointerMove = (event: PointerEvent) => {
            if (event.isPrimary === false) return;
            mouseX = event.clientX - window.innerWidth / 2;
            mouseY = event.clientY - window.innerHeight / 2;
        };
        mount.style.touchAction = "none";
        window.addEventListener("pointermove", onPointerMove);

        // ======================
        // ANIMATE
        // ======================
        let last = performance.now();
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);

            const now = performance.now();
            let delta = (now - last) / 1000;
            if (delta > 1) delta = 1;
            last = now;

            const energy = getEnergy();

            // Audio integration: adjust freedom factor based on energy
            velocityUniforms["freedomFactor"].value = 0.5 + energy * 0.5;
            // Also adjust separation and alignment slightly with energy
            velocityUniforms["separationDistance"].value = 20.0 + energy * 20.0;

            positionUniforms["time"].value = now;
            positionUniforms["delta"].value = delta;
            velocityUniforms["time"].value = now;
            velocityUniforms["delta"].value = delta;
            birdUniforms["time"].value = now;
            birdUniforms["delta"].value = delta;

            velocityUniforms["predator"].value.set(
                0.5 * mouseX / (window.innerWidth / 2),
                -0.5 * mouseY / (window.innerHeight / 2),
                0
            );

            gpuCompute.compute();

            birdUniforms["texturePosition"].value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
            birdUniforms["textureVelocity"].value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;

            // warna birds ikut audio - Hue shift based on energy
            birdUniforms["color"].value.setHSL(energy, 1.0, 0.5);

            // 🌅 background ikut waktu
            const targetColor = getSkyColor();
            (scene.background as THREE.Color).lerp(targetColor, 0.01);
            if (scene.fog instanceof THREE.Fog) {
                scene.fog.color.copy(scene.background as THREE.Color);
            }

            renderer.render(scene, camera);
        };
        animate();

        // ======================
        // RESIZE
        // ======================
        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", onResize);

        // ======================
        // CLEANUP
        // ======================
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("pointermove", onPointerMove);

            audio.pause();
            audio.src = "";
            source.disconnect();
            analyser.disconnect();
            audioCtx.close();

            geometry.dispose();
            material.dispose();
            renderer.dispose();
            mount.removeChild(renderer.domElement);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current || !audioCtxRef.current) return;

        if (audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume();
        }

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (audioRef.current) {
            audioRef.current.volume = val;
        }
    };

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#ffffff" }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

            {/* Solana Wallet Button */}
            <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 1001 }}>
                <AppKitButton />
            </div>

            {/* iOS Style Glass Media Player */}
            <div style={{
                position: "absolute",
                bottom: "50px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "92%",
                maxWidth: "420px",
                padding: "26px",
                borderRadius: "32px",
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))",
                backdropFilter: "blur(60px) saturate(220%) brightness(108%)",
                WebkitBackdropFilter: "blur(60px) saturate(220%) brightness(108%)",
                border: "1px solid rgba(255, 255, 255, 0.45)",
                boxShadow: `
                    0 10px 15px -3px rgba(0, 0, 0, 0.05), 
                    0 20px 40px -10px rgba(0, 0, 0, 0.2), 
                    0 30px 60px -15px rgba(0, 0, 0, 0.25),
                    inset 0 1px 1px rgba(255, 255, 255, 0.4)
                `,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif",
                color: "#1a1a1c",
                pointerEvents: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "22px",
                userSelect: "none"
            }}>
                {/* Track Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <div style={{
                        width: "68px",
                        height: "68px",
                        borderRadius: "16px",
                        background: metadata.artwork ? `url(${metadata.artwork}) center/cover no-repeat` : "linear-gradient(135deg, #FF3B30, #FF9500)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 12px 24px rgba(255, 59, 48, 0.25)",
                        overflow: "hidden"
                    }}>
                        {!metadata.artwork && (
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontWeight: 800,
                            fontSize: "20px",
                            letterSpacing: "-0.6px",
                            color: "#1a1a1c",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}>{metadata.title}</div>
                        <div style={{
                            fontSize: "15px",
                            opacity: 0.55,
                            marginTop: "2px",
                            fontWeight: 500,
                            color: "#1a1a1c",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}>{metadata.artist}</div>
                    </div>
                </div>

                {/* Progress Bar (Visual for Live) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{
                        width: "100%",
                        height: "5px",
                        background: "rgba(0, 0, 0, 0.05)",
                        borderRadius: "3px",
                        overflow: "hidden",
                        border: "1px solid rgba(0,0,0,0.02)"
                    }}>
                        <div style={{
                            width: isPlaying ? "100%" : "0%",
                            height: "100%",
                            background: "linear-gradient(90deg, #1d1d1f, #444)",
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                        }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, opacity: 0.6, letterSpacing: "0.5px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#FF3B30", boxShadow: "0 0 8px rgba(255, 59, 48, 0.6)" }} />
                            <span>LIVE</span>
                        </div>
                        <span>∞</span>
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 15px" }}>
                    <button style={{ background: "none", border: "none", cursor: "pointer", padding: "10px", color: "#1a1a1c", opacity: 0.35, transition: "opacity 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"} onMouseLeave={(e) => e.currentTarget.style.opacity = "0.35"}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                    </button>
                    <button
                        onClick={togglePlay}
                        style={{
                            background: "#1a1a1c",
                            border: "none",
                            borderRadius: "50%",
                            width: "70px",
                            height: "70px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            boxShadow: "0 15px 30px rgba(0,0,0,0.15)",
                            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s"
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.92)"}
                        onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                        {isPlaying ? (
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        ) : (
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>
                    <button style={{ background: "none", border: "none", cursor: "pointer", padding: "10px", color: "#1a1a1c", opacity: 0.35, transition: "opacity 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"} onMouseLeave={(e) => e.currentTarget.style.opacity = "0.35"}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                    </button>
                </div>

                {/* Volume Slider */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 10px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(0,0,0,0.4)"><path d="M3 9v6h4l5 5V4L7 9H3z" /></svg>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        style={{
                            flex: 1,
                            accentColor: "#1d1d1f",
                            height: "4px",
                            cursor: "pointer",
                            appearance: "none",
                            background: "rgba(0,0,0,0.1)",
                            borderRadius: "2px"
                        }}
                    />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(0,0,0,0.4)"><path d="M14 8.83v6.34L11.83 13H9v-2h2.83L14 8.83M16 4l-1.5 1.5C17.5 8 17.5 16 14.5 18.5L16 20c4.5-5 4.5-11 0-16z" /></svg>
                </div>
            </div>
        </div>
    );
}


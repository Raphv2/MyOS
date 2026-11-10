import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/GLTFLoader.js';

export async function load3DModel(container, mesh) {
    if (!container) {
        console.error("Le container est invalide.");
        return;
    }

    const iw = container.clientWidth;
    const ih = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, iw / ih, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(iw, ih);
    renderer.shadowMap.enabled = true; // Activer les ombres
    container.appendChild(renderer.domElement);

    const loader = new GLTFLoader();
    let gltf;

    try {
        gltf = await loader.loadAsync(`img/3d/${mesh}.glb`);
        console.log("GLB Loaded:", gltf);
        
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        const rotationAngle = Math.PI / 2; // 90 degrés en radians
        model.rotation.set(0, rotationAngle, 0);

        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(0, 20, 20);
        scene.add(pointLight);

        const ambientLight = new THREE.AmbientLight(0x404040); 
        scene.add(ambientLight);

        model.scale.set(1, 1, 1);
        model.position.set(0, 5, 0);
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();

        camera.position.set(center.x, center.y + (size * 0.5), center.z + (size * 0.5));
        camera.lookAt(center);

        const mixer = new THREE.AnimationMixer(model);
        if (gltf.animations.length !== 0) {
            for (let i = 0; i < gltf.animations.length; i++) {
                mixer.clipAction(gltf.animations[i]).setDuration(4).play();
            }
        }

        const clock = new THREE.Clock();
        loop();

        function loop() {
            requestAnimationFrame(loop);
            const dt = clock.getDelta();
            mixer.update(dt);
            renderer.render(scene, camera);
        }

        const resizeObserver = new ResizeObserver(() => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        });
        resizeObserver.observe(container);

        // Gestion des mouvements de la caméra avec la souris
        let isMouseDown = false;
        let previousMousePosition = { x: 0, y: 0 };

        container.addEventListener('mousemove', (event) => {
            if (isMouseDown) {
                const deltaX = event.clientX - previousMousePosition.x;
                const deltaY = event.clientY - previousMousePosition.y;
                model.rotation.y += deltaX * 0.01; // Tourner l'objet
                model.rotation.x += deltaY * 0.01; // Tourner l'objet
            }
            previousMousePosition = { x: event.clientX, y: event.clientY };
        });

        container.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                isMouseDown = true;
            }
        });

        container.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                isMouseDown = false;
            }
        });

        // Gestion du zoom avec la molette de la souris
        container.addEventListener('wheel', (event) => {
            event.preventDefault();
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            direction.normalize();
            const zoomSpeed = 0.05;
            camera.position.addScaledVector(direction, event.deltaY * zoomSpeed);
        });

        // Gestion des gestes tactiles pour le zoom et la rotation
        let initialDistance = 0;
        let initialAngle = 0;
        let isPinching = false;

        container.addEventListener('touchstart', (event) => {
            if (event.touches.length === 2) {
                isPinching = true;
                initialDistance = getDistance(event.touches[0], event.touches[1]);
                initialAngle = Math.atan2(event.touches[1].clientY - event.touches[0].clientY,
                                            event.touches[1].clientX - event.touches[0].clientX);
            } else if (event.touches.length === 1) {
                // Enregistrer l'angle initial pour un seul doigt
                initialAngle = Math.atan2(event.touches[0].clientY - center.y,
                                           event.touches[0].clientX - center.x);
            }
        });

        container.addEventListener('touchmove', (event) => {
            if (isPinching && event.touches.length === 2) {
                const currentDistance = getDistance(event.touches[0], event.touches[1]);
                const zoomFactor = currentDistance / initialDistance;

                // Ajuster la position de la caméra
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);
                direction.normalize();
                camera.position.addScaledVector(direction, (zoomFactor - 1) * 0.5);
            } else if (event.touches.length === 1) {
                // Rotation avec un seul doigt
                const deltaX = event.touches[0].clientX - previousMousePosition.x;
                const deltaY = event.touches[0].clientY - previousMousePosition.y;
            
                model.rotation.y += deltaX * 0.01; 
                model.rotation.x += deltaY * 0.01; 
            
                previousMousePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY }; 
            }
        });

        container.addEventListener('touchend', (event) => {
            if (event.touches.length < 2) {
                isPinching = false;
            }
        });

        function getDistance(touch1, touch2) {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

    } catch (error) {
        console.error("Erreur lors du chargement du fichier GLB :", error);
    }
}

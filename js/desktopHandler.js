import * as t  from './tab.js';


export async function generateDesktopMenu(width, height, isMobile) {
    try {
        const response = await fetch('data.json'); // Charger le fichier JSON
        const items = await response.json(); // Récupérer les données JSON

        const screenDiv = document.querySelector('.screen'); 

        updateDateTime(isMobile);
        
        exitFullscreen();

        toggleDropdownMenu('full_screen_slider', 'exit_menu');

        if (!screenDiv) return;

        // Filtrer les éléments dans le dossier avec l'id 8
        const filteredItems = items.folders.concat(items.files).filter(item => item.folder_id === 8);

        filteredItems.forEach(item => {
            
            if (document.getElementById(item.name)) {
                return;
            }
            const menuItem = document.createElement('div');
            menuItem.className = 'menu_item';
            menuItem.id = item.name;

            const img = document.createElement('img');

            if (item.extension === 'shortcut') {
                img.src = 'img/directory.png';
            } else {
                img.src = `img/${item.extension}.png`;

            }

            const anchor = document.createElement('a');
            anchor.className = 'menu_link';
            anchor.textContent = item.name;

            menuItem.appendChild(img);
            menuItem.appendChild(anchor);
            screenDiv.appendChild(menuItem);
        });

        console.log("Le bureau s'est généré correctement avec les éléments du dossier 8");
        setInterval(updateDateTime(isMobile), 1000);
        openFileExplorer(screenDiv, 'id_Home_icon', width, height);
        const eye = document.getElementById('eye');
        const content = document.getElementById('content_eye_widget');
        const radius = 1;
        makeEyeFollowMouse(eye, content, radius);
        toggleDropdownMenu('name_container_button', 'raph_dropdown');
        toggleDropdownMenu('name_container_button2', 'start_menu');

        shutdownHandler();

    } catch (err) {
        console.log('Erreur lors de la génération du menu de bureau :', err);
    }
}


export function updateDateTime(isMobile) {

    const datetime = document.getElementById("datetime");
    if(!datetime) return;

    const now = new Date();
    
    const formattedTime = now.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  
    const formattedDate = now.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
    });
    
    const parts = formattedDate.split(' '); 
    const shortMonth = parts[1].substring(0, 4); 
    const finalDate = `${parts[0]} ${shortMonth} ${parts[2]}`;
    
    if(!isMobile) datetime.innerHTML = `${finalDate} ${formattedTime}`;
    else datetime.innerHTML = `${formattedTime}`;
  }

function toggleDropdownMenu(buttonId, menuId) {
    const button = document.getElementById(buttonId);
    const menu = document.getElementById(menuId);

    if (!button || !menu) {
        return;
    }

    button.addEventListener('click', function(event) {
        menu.classList.toggle('show');
        event.stopPropagation(); 
    });


    menu.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    // Fermer le menu si on clique ailleurs
    document.addEventListener('click', function(event) {
        if (!menu.contains(event.target) && !button.contains(event.target)) {
            menu.classList.remove('show');
        }
    });

    menu.addEventListener('mouseleave', function() {
        menu.classList.remove('show');
    });
}

function openFileExplorer(screen, id, width, height) {
    document.addEventListener('dblclick', function(e) {
        // Vérifier si l'élément cliqué ou son parent a l'ID ciblé
        const targetElement = e.target.closest(`#${id}`);

        if (!targetElement) return; 

        const HomeExplorer = document.getElementById(id); // Corrigé ici
        if (!HomeExplorer) {
            console.error("HomeExplorer est vide");
            return;
        }

        const id_tab = HomeExplorer.id.replace('id_', '').replace('_icon', '');
        console.log(id_tab);

        t.createExplorerSquare(
            screen,
            `${id_tab}_tab`,
            ``,
            `id_${id_tab}_border_inner_contener`,
            `id_${id_tab}_inner_contener`,
            '',
            width,
            height,
            `file explorer`
        );
    });
}


function makeEyeFollowMouse(eyeElement, containerElement, radius) {
    if (!eyeElement || !containerElement || !radius) return;

    let timeoutId;
    let animationFrameId;
    let randomMovementId;
    let isIdle = false;

    document.addEventListener('mousemove', (event) => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        clearTimeout(timeoutId);
        clearInterval(randomMovementId);
        isIdle = false;
        
        const rect = containerElement.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const deltaX = mouseX - centerX;
        const deltaY = mouseY - centerY;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        let x, y;
        if (distance < radius * (window.innerWidth / 100)) {
            x = deltaX;
            y = deltaY;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            x = Math.cos(angle) * radius * (window.innerWidth / 100);
            y = Math.sin(angle) * radius * (window.innerWidth / 100);
        }

        eyeElement.style.transform = `translate(${x}px, ${y}px)`;

        timeoutId = setTimeout(() => {
            isIdle = true;
            let startTime;
            const duration = 500;

            function animateBackToCenter(timestamp) {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);

                const easedProgress = gaussianEase(progress);

                const currentX = x * (1 - easedProgress);
                const currentY = y * (1 - easedProgress);

                eyeElement.style.transform = `translate(${currentX}px, ${currentY}px)`;

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animateBackToCenter);
                } else {
                    startRandomMovement();
                }
            }

            animationFrameId = requestAnimationFrame(animateBackToCenter);
        }, 1000);
    });

    function gaussianEase(t) {
        return 1 - Math.exp(-5 * t * t);
    }

    function startRandomMovement() {
        randomMovementId = setInterval(() => {
            if (!isIdle) return;
            
            const randomX = (Math.random() - 0.5) * 10;
            const randomY = (Math.random() - 0.5) * 4;

            eyeElement.style.transform = `translate(${randomX}px, ${randomY}px)`;
        }, 500); 
    }
}



function shutdownHandler(){
    document.getElementById('shutdown').addEventListener('click', function() {

      if (window.location.href.includes('index.php?page=endoflight')) {

          window.location.href = 'index.php';
      } else {

          window.location.href = 'index.php?page=endoflight';
      }
    });
  }
  
  function exitFullscreen(){
    let fullScreen = true;
    document.getElementById('exit_fullscreen').addEventListener('click', function() {
        event.preventDefault(); // Empêche l'action par défaut

        fullScreen = false;

        localStorage.setItem('fullScreen', fullScreen);
        window.location.href = 'index.php';

    });
  }


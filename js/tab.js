import { update_file_explorer , openFolders, openShortcut,  loadTextFile, startLoadingAnimation, setupZoomAndDrag, setupResizeObserver} from './applicationHandler.js';

import { load3DModel} from './meshHandler.js'; // Assurez-vous que le chemin est correct



let lastPosition = { x: 20, y: 20 };



export function createSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    

  const newSquare = createDiv(id, 'new-square', '', parentElement, backgroundImagePath, width, height);
  
  if(!newSquare) return;
  
if(isMobile){
        newSquare.style.width = '100%';
      newSquare.style.height = '88%';
      newSquare.style.top = '3.5%';
      newSquare.style.left = '0';
      newSquare.style.position = 'absolute'; 
  }else{
        newSquare.style.position = 'absolute';
        newSquare.style.left = `${lastPosition.x + 3}vw`; 
        newSquare.style.top = `${lastPosition.y + 3}vh`; 
    
        lastPosition.x += 1; 
        lastPosition.y += 2; 
    
        if (lastPosition.x > 28) lastPosition.x = 20+1; 
        if (lastPosition.y > 28) lastPosition.y = 20;
  }
    

  let fullscreen = false;
  let minus = false;


  const top_tab = createDiv(null, 'top_tab', '', newSquare, backgroundImagePath);

  const border_inner_contener = createDiv(id3, 'border-inner-contener', '', newSquare, backgroundImagePath, null, null);
  if(id != 'application6_tab') createDiv(id4, 'inner_contener', '', border_inner_contener, backgroundImagePath);

  const closeButton = createDiv(null, 'close-btn', '', top_tab, null, null, null);
  const fullScreenButton = createDiv(null, 'full_screen_btn', '', top_tab, null, null, null);
  const minusButton = createDiv(null, 'minus_button', '', top_tab, null, null, null);
  createDiv(null, 'application_name', text, top_tab, null, null, null);

  closeButton.addEventListener('click', function () {
    removeDiv(id);
    if(id2 != 'application6') removeDiv(id2);
    lastPosition = { x: 30, y: 30 }
  });

  fullScreenButton.addEventListener('click', function () {
    if (!fullscreen) {
      newSquare.style.width = '100%';
      newSquare.style.height = '92.5%';
      newSquare.style.top = '3.20vh';
      newSquare.style.left = '0';
      newSquare.style.position = 'absolute'; 
      fullscreen = true;
    } else {
      newSquare.style.width = width;
      newSquare.style.height = height;
      newSquare.style.top = `${lastPosition.y + 3}vh`;
      newSquare.style.left =`${lastPosition.x + 3}vw`;
      newSquare.style.position = 'absolute'; 
      fullscreen = false;
    }
  });

  minusButton.addEventListener('click', function () {
    if (!minus) {
        // Récupérer l'élément avec id2 (target)
        const targetElement = document.getElementById(id2);

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect(); 
            const parentRect = targetElement.parentElement.getBoundingClientRect(); 

            const relativeTop = rect.top - parentRect.top;
            const relativeLeft = rect.left - parentRect.left;

            newSquare.style.width = `${(rect.width / window.innerWidth) * 100}vw`;
            newSquare.style.height = `${(rect.height / window.innerHeight) * 100}vh`;
            newSquare.style.top = `${160}vh`;
            newSquare.style.left = `${(relativeLeft / window.innerWidth) * 100}vw`;
            newSquare.style.zIndex = '-1';
        }
      else {

        newSquare.style.width = width;
        newSquare.style.height = height;
        newSquare.style.top = `${lastPosition.y }vh`;
        newSquare.style.left =`${lastPosition.x }vw`;
        newSquare.style.position = 'absolute'; 
        newSquare.style.zIndex = '1';
        minus = false;
      }

        minus = true;
    }   
    const targetElement = document.getElementById(id2);
      targetElement.addEventListener('click', function() {
        if(isMobile){
            newSquare.style.width = '100%';
            newSquare.style.height = '88%';
            newSquare.style.top = '3.5%';
            newSquare.style.left = '0';
            newSquare.style.position = 'absolute'; 
            newSquare.style.zIndex = '1';
            minus = false;
        }else{
            newSquare.style.width = width;
            newSquare.style.height = height;
            newSquare.style.top = `${lastPosition.y }vh`;
            newSquare.style.left =`${lastPosition.x }vw`;
            newSquare.style.position = 'absolute';
            newSquare.style.zIndex = '1';
        
            // Réinitialiser minus à false
            minus = false;
        }

      });
    
});
  IndexUpdate();
}


  
  export function createDiv(id, className, textContent, parentElement, backgroundImagePath, width, height) {
    const newDiv = document.createElement('div');
    
  
    if (id) {
      newDiv.id = id;
    }
  
    if (className) {
      newDiv.className = className;
    }
  
    if (textContent) {
      newDiv.textContent = textContent;
    }
  
    if (backgroundImagePath) {
      newDiv.style.backgroundImage = `url(${backgroundImagePath})`;
      newDiv.style.backgroundSize = 'cover';
      newDiv.style.backgroundPosition = 'center';
      newDiv.style.backgroundRepeat = 'no-repeat';
    }

    if (width && height) {
      newDiv.style.height = height;
      newDiv.style.width = width;
    }

  
    if (parentElement) {
      const existingApp = parentElement.querySelector('#' + id);
      if (existingApp) {
       
        console.log('Une application avec cet ID est déjà ouverte.');
        
       
        return;
      } else {
        parentElement.appendChild(newDiv);
      }
    } else {
      document.body.appendChild(newDiv);
    }
  
    return newDiv;
  }
  
  function removeDiv(id) {
    const divToRemove = document.getElementById(id);
    if (divToRemove) {
        divToRemove.remove(); 
        console.log(`La div avec l'ID "${id}" a été supprimée.`);
    } else {
        console.log(`Aucune div trouvée avec l'ID "${id}".`);
    }
}

let explorerCount = 0; // Compteur global pour générer des IDs uniques

export function createExplorerSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  explorerCount++; // Incrémenter pour obtenir un identifiant unique
  const uniqueId = `file_explorer_${id}`;

  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);


  const borderInnerContainer = document.getElementById(id3); 
  
  if (borderInnerContainer) {
    borderInnerContainer.innerHTML = `
      <div class="header" id="header_${id}">
        <div class="row_explorer" id="row_explorer_${id}">
          <div id="return_explorer_${id}" class="nav_button"><</div>
          <div class="search_bar" id="search_bar_${id}">
            <div class="search_bar_text" id="search_bar_text_${id}" ></div>
          </div>
        </div>
      </div>

      <div class="content2" id="content_${id}">
        <div class="list_folder" id="list_folder_${id}">
          <div class="list_folder_contener" id="list_folder_contener_${id}"></div>
        </div>
        <div class="inner_folders" id="inner_folders_${id}"></div>
      </div>

      <div class="footer_file_explorer" id="footer_file_explorer_${id}">
        <div class="folder_name" id="folder_name_${id}">
          <div class="folder_name_text" id="folder_name_text_${id}"></div>
        </div>
      </div>
    `;
  }
  update_file_explorer(id).then(() => {
  openFolders(id);
  OpenApplication(id);
  openShortcut(id.replace('_tab', ''), id);
  });
  
  return newSquare;
}

export function createPictureSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  
  const uniqueId = `${id}`;

  // Appeler createSquare pour créer la base du "tab"
  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);

  // Sélectionner le conteneur principal où ajouter le contenu
  const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
  
  if (borderInnerContainer) {
    const imagePath = `img/illustrations/${id.replace('png_tab', '')}.png`;

    borderInnerContainer.innerHTML = `
      <div class="content" id="content_${id}" style="display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative; height: 95%; top:5%;">
        <img src="${imagePath}" alt="Image" id="image_${id}" class="image_" style="width: 100%; height: auto; transform: translate(-50%, -50%) scale(1); transition: transform 0.1s ease-in-out; position: absolute; top:50%; left:50%; ">
      </div>
      <div class="footer_file_explorer" id="footer_file_explorer_${id}" style="top:0; display: flex; justify-content: center; align-items: center; padding: 5px; box-shadow: 
        inset 1px 1px 0px rgba(0, 0, 0, 1),
        inset -1px -1px 0px rgb(134, 133, 133);">
        <input type="range" class="scale-slider" id="scaleSlider_${id}" min="0.1" max="2" step="0.01" value="1">
      </div>
    `;

    // Ajouter la gestion du zoom et du déplacement
    setupZoomAndDrag(id);
    setupResizeObserver(id);
  }

  return newSquare;
}




export function createMusicSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  
  const uniqueId = `${id}`;

  // Appeler createSquare pour créer la base du "tab"
  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);

  // Sélectionner le conteneur principal où ajouter le contenu
  const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
  
  if (borderInnerContainer) {
    borderInnerContainer.innerHTML = `


      <div class="content" id="content_${id}">
        
      </div>

      <div class="footer_file_explorer" id="footer_file_explorer_${id}">

      </div>
    `;
  }
  
  

  return newSquare;
}

export function createTextSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  
  const uniqueId = `${id}`;

  // Appeler createSquare pour créer la base du "tab"
  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);

  // Sélectionner le conteneur principal où ajouter le contenu
  const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
  
  if (borderInnerContainer) {
    borderInnerContainer.innerHTML = `
      <div class="content" id="content_${id}">
        <textarea id="text_${id}" class="text_area"></textarea>
        
      </div>
    `;
  }
  loadTextFile(id);
  return newSquare;
}

export function createShellSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  
  const uniqueId = `${id}`;

  // Appeler createSquare pour créer la base du "tab"
  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);

  // Sélectionner le conteneur principal où ajouter le contenu
  const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
  
  if (borderInnerContainer) {
    borderInnerContainer.innerHTML = `
      <div class="content" id="content_${id}">
        <textarea id="text_${id}" class="text_area"></textarea>
        
      </div>
    `;
  }
  return newSquare;
}

export function createPDFSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  
  const uniqueId = `${id}`;

  // Appeler createSquare pour créer la base du "tab"
  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);

  // Sélectionner le conteneur principal où ajouter le contenu
  const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
  
  if (borderInnerContainer) {
    const imagePath = `img/pdf/${id.replace('pdf_tab', '')}.png`;

    borderInnerContainer.innerHTML = `
      <div class="content" id="content_${id}" style="display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative; height: 95%; top:5%;">
        <img src="${imagePath}" alt="Image" id="image_${id}" class="image_" style="width: 100%; height: auto; transform: translate(-50%, -50%) scale(1); transition: transform 0.1s ease-in-out; position: absolute; top:50%; left:50%; ">
      </div>
      <div class="footer_file_explorer" id="footer_file_explorer_${id}" style="top:0; display: flex; justify-content: center; align-items: center; padding: 5px; box-shadow: 
        inset 1px 1px 0px rgba(0, 0, 0, 1),
        inset -1px -1px 0px rgb(134, 133, 133);">
        <input type="range" class="scale-slider" id="scaleSlider_${id}" min="0.1" max="2" step="0.01" value="1">
 
      </div>
      <a href="img/pdf/${id.replace("pdf_tab", '')}.pdf" download="${id.replace("pdf_tab", '')}.pdf">
        <button class= "download_button">
            <img class="download_icon" src="img/download_icon.png">
        </button>
      </a>
    `;

    // Ajouter la gestion du zoom et du déplacement
    setupZoomAndDrag(id);
    setupResizeObserver(id);
  }

  return newSquare;
}

export function create3DSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  
  const uniqueId = `${id}`;

  // Appeler createSquare pour créer la base du "tab"
  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);

  // Sélectionner le conteneur principal où ajouter le contenu
  const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
  
  if (borderInnerContainer) {
    borderInnerContainer.innerHTML = `


      <div class="content" id="content_${id}">

      </div>

    `;
  }


  const containerDiv = document.getElementById(`content_${id}`);
  // Remplacez par l'ID de votre div
  console.log("l'id est" ,id);
  load3DModel(containerDiv, id.replace('blend_tab', ''));
  
  return newSquare;
}

export function createGLSLSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  
  const uniqueId = `${id}`;
  console.log("je creer le" ,id);
  // Appeler createSquare pour créer la base du "tab"
  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);

  // Sélectionner le conteneur principal où ajouter le contenu
  const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
  
  if (borderInnerContainer) {
    borderInnerContainer.innerHTML = `


      <div class="content" id="content_${id}">

      </div>

    `;
  }

  const containerDiv = document.getElementById(`content_${id}`);
  // Remplacez par l'ID de votre div
  console.log("l'id est" ,id);
  loadGlslShader(`img/shader/${id.replace('glsl_tab', '')}.vert`, `img/shader/${id.replace('glsl_tab', '')}.frag`, containerDiv);
  
  return newSquare;
}

  export function createErrorSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text) {
  
    const uniqueId = `${id}`;
  
    // Appeler createSquare pour créer la base du "tab"
    const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);
  
    // Sélectionner le conteneur principal où ajouter le contenu
    const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
    
    if (borderInnerContainer) {
      borderInnerContainer.innerHTML = `
  
  
        <div class="content" id="content_${id}">
  
        </div>
  
      `;
    }


  
  return newSquare;
}

export function createOtherSquare(parentElement, id, id2, id3, id4, backgroundImagePath, width, height, text,path) {
  
  const uniqueId = `${id}`;

  // Appeler createSquare pour créer la base du "tab"
  const newSquare = createSquare(parentElement, uniqueId, id2, id3, id4, backgroundImagePath, width, height, text);

  // Sélectionner le conteneur principal où ajouter le contenu
  const borderInnerContainer = document.getElementById(id3); // Correspond à `border-inner-contener`
  console.log("l'id est :" + id3);
  
  if (borderInnerContainer) {
    borderInnerContainer.innerHTML = `
      <div class="content" id="content_${id}">
        <textarea id="loading_url_${id}" class="loading_url" style="cursor: none;"></textarea>
      
      

      </div>
    `;
  }
  startLoadingAnimation(id, path);
  return newSquare;
}

export function enableDrag2(classname, offSetX, offSetY) {
  document.addEventListener('pointerdown', function (e) {
      let item = e.target;

      if (!item.classList.contains(classname)) return;
      if (e.target.closest('.scroll_bar')) return;

      const shiftX = e.clientX - item.getBoundingClientRect().left;
      const shiftY = e.clientY - item.getBoundingClientRect().top;

      if (!item.style.left) item.style.left = '0px';
      if (!item.style.top) item.style.top = '0px';

      let isMoved = false;
      let isMoving = false;

      function moveAt(pageX, pageY) {
        const newLeft = pageX - shiftX;
        const newTop = pageY - shiftY;

        const newLeftVW = (newLeft / window.innerWidth) * 100;
        const newTopVH = (newTop / window.innerHeight) * 100;

        item.style.left = `${newLeftVW - offSetX}vw`;
        item.style.top = `${newTopVH - offSetY}vh`;

        isMoved = true;
      }

      function onPointerMove(event) {
        if (isMoving) return;

        isMoving = true;
        requestAnimationFrame(() => {
          moveAt(event.pageX, event.pageY);
          isMoving = false;
        });
      }

      document.addEventListener('pointermove', onPointerMove);

      // Déplacer l'événement pointerup pour le document entier
      function onPointerUp() {
          document.removeEventListener('pointermove', onPointerMove);

          if (!isMoved) return;

          let left = parseFloat(item.style.left) || 0;
          let top = parseFloat(item.style.top) || 0;

          item.style.left = `${left}vw`;
          item.style.top = `${top}vh`;

          // Supprimer l'événement pointerup pour éviter des fuites de mémoire
          document.removeEventListener('pointerup', onPointerUp);
      }

      // Attacher l'événement pointerup au document pour qu'il fonctionne même si l'élément n'est pas sous le curseur
      document.addEventListener('pointerup', onPointerUp, { once: true });

      item.ondragstart = () => false;
  });
}


export function IndexUpdate(){
  const divs = document.querySelectorAll('.new-square');

  divs.forEach(div => {

      div.style.zIndex = 1;

      div.addEventListener('click', () => {
          divs.forEach(d => d.style.zIndex = 1);
          div.style.zIndex = 10;
      });
 
 
    });
}

export function IndexClickApplication(classname, rectangularBar) {
  rectangularBar.addEventListener('click', function (e) {
    if (e.target.classList.contains(classname)) {
      let appID = e.target.id.replace(/_icon$/, '');
      appID = appID.replace('id_', '');

      let appID_tab = document.getElementById(`${appID}_tab`);
      let file_explorer_ID_tab = document.getElementById(`file_explorer_${appID}_tab`);

      console.log(file_explorer_ID_tab);

      // Si au moins un des deux éléments existe
      if (appID_tab || file_explorer_ID_tab) {
        const allTabs = document.querySelectorAll('.new-square');

        allTabs.forEach(tab => tab.style.zIndex = 1);

        if (file_explorer_ID_tab) {
          file_explorer_ID_tab.style.zIndex = 10;
        } else if (appID_tab) {
          appID_tab.style.zIndex = 10;
        }
      }
    }
  });
}

export function change_id(parentElement, className, newId ) {
  if (parentElement && className && newId) {
    const targetElement = parentElement.querySelector(`.${className}`);
    if (targetElement) {
      targetElement.id = newId;
    }
  }
}

export function OpenApplication(id) {
  const innerFoldersContainer = document.getElementById(`inner_folders_${id}`);
  const width = '50%';
  const height = '50%';
  const screen = document.querySelector('.screen');
  const rectangularBar = document.querySelector('.rectangular-bar');
  
  let lastClickTime = 0;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  let num = 0;  // Initialisation de num
  
  const handleClick = (e) => {
    if (e.target.id.includes('.')) {
      const app = e.target.id;
      const extension = app.split('.').pop(); // Récupère l'extension du fichier
      const appName = app.replace('.', ''); // Supprime l'extension du nom du fichier
      console.log(app + ' ' + extension + ' ' + appName);
      
      const createFunctionMap = {
        png: createPictureSquare,
        blend: create3DSquare,
        pdf: createPDFSquare,
        txt: createTextSquare,
        mp3: createMusicSquare
      };

      if (createFunctionMap[extension]) {
        try {
          createFunctionMap[extension](
            screen,
            `${appName}_tab`,  // Corriger l'utilisation des variables avec interpolation de chaînes
            `${appName}_icon`,
            `${appName}_border_inner_contener`,
            `${appName}_inner_contener`,
            '',
            width,
            height,
            app
          );
        } catch (error) {
          console.error("Erreur lors de la création de la fenêtre :", error);
          num++;
          createErrorSquare(screen, `error${num}_tab`, '', `id_error${num}_border_inner_contener`, `id_error${num}_inner_contener`, '', '30', '20', 'error');
        }
      } else {
        try {
          if (appName.replace('exe', '') == 'Github') {
            createOtherSquare(
              screen,
              `${appName}_tab`,
              `${appName}_icon`,
              `${appName}_border_inner_contener`,
              `${appName}_inner_contener`,
              '',
              width,
              height,
              app,
              "https://github.com/Raphv2"
            );
            console.log("Ouvert :", app);
          } else if (appName.replace('exe', '') == 'Linkedin') {
            createOtherSquare(
              screen,
              `${appName}_tab`,
              `${appName}_icon`,
              `${appName}_border_inner_contener`,
              `${appName}_inner_contener`,
              '',
              width,
              height,
              app,
              "https://www.linkedin.com/in/raphael-gosset/"
            );
            console.log("Ouvert :", app);
          }

          createSquare(
            screen,
            `${appName}_tab`,
            `${appName}_icon`,
            `${appName}_border_inner_contener`,
            `${appName}_inner_contener`,
            '',
            width,
            height,
            app
          );
        } catch (error) {
          console.error("Erreur lors de l'ouverture du fichier :", error);
          num++;
          createErrorSquare(screen, `error${num}_tab`, '', `id_error${num}_border_inner_contener`, `id_error${num}_inner_contener`, '', '30', '20', 'error');
        }
      }

      if (extension !== 'exe') {
        createDiv(`${appName}_icon`, "application", '', rectangularBar, `img/${extension}.png`, '', '');
      } else {
        createDiv(`${appName}_icon`, "application", '', rectangularBar, `img/${appName.replace(extension, '').toLowerCase()}.png`, '', '');
      }

      addRecentFiles(e.target);
    }
  };

  if (isMobile) {
    innerFoldersContainer.addEventListener('touchstart', function (e) {//empecher le zoom
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - lastClickTime;

      if (timeDiff < 300 && timeDiff > 0) {
        e.preventDefault();
      }
        lastClickTime = currentTime;
    }, { passive: false });
    
    innerFoldersContainer.addEventListener('touchend', handleClick, { passive: true });
  } else {
    innerFoldersContainer.addEventListener('dblclick', handleClick);//PC
  }
}


export function addRecentFiles(div) {
  const recentFilesDiv = document.querySelector(".recent_files"); 

  if (!recentFilesDiv) {
      console.error("L'élément recent_files n'existe pas.");
      return;
  }

  if (recentFilesDiv.children.length + 1 > 6) {
    recentFilesDiv.removeChild(recentFilesDiv.lastChild);
  }

  const menuItem = document.createElement('div');
  menuItem.className = 'menu_item';
  menuItem.id = div.id; 

  const img = document.createElement('img');

  img.src = div.querySelector('img').src;

  const anchor = document.createElement('a');
  anchor.className = 'menu_link';
  anchor.textContent = div.id; 

  menuItem.appendChild(img);
  menuItem.appendChild(anchor);
  const menuItems = recentFilesDiv.children;
  for (let item of menuItems) {
      if (item.id === menuItem.id) {
          console.log('Found Item:', item);
          recentFilesDiv.removeChild(item);
          break;
      }
  }

  recentFilesDiv.insertBefore(menuItem, recentFilesDiv.firstChild);
}



export function OpenApplicationTarget(parent){

  const addedChildren = new Set();

  const fileExporer = document.getElementById('id_Home_icon');

  addedChildren.add(fileExporer);

  fileExporer.addEventListener('mouseenter',  (e) => handleMouseEnter(e));
  fileExporer.addEventListener('mouseleave',  (e) => handleMouseOver(e));

  const observer = new MutationObserver((mutationsList) => {
      mutationsList.forEach((mutation) => {
          if (mutation.type === "childList") {

              mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1) { 
                      addedChildren.add(node);
                      node.addEventListener('mouseenter',  (e) => handleMouseEnter(e));
                      node.addEventListener('mouseleave',  (e) => handleMouseOver(e));
                  }
              });

              mutation.removedNodes.forEach((node) => {
                  if (node.nodeType === 1) {
                      node.removeEventListener("mouseenter", handleMouseEnter);
                      node.removeEventListener("mouseleave", handleMouseOver);
                      addedChildren.delete(node);
                  }
              });
          }
      });
  });

  observer.observe(parent, { childList: true });

 
}

export function handleMouseEnter(e){
  const canvaName = document.getElementsByClassName('view_name')[0];
  canvaName.textContent = e.target.id.replace(/(id_|_icon|blend|png|mp3|txt|pdf|exe)/g, '');
  canvaName.parentElement.style.display = "inline-flex";
}


export function handleMouseOver(e){
  const canvaName = document.getElementsByClassName('view_name')[0];
  canvaName.textContent = '';
  canvaName.parentElement.style.display = "none";
}

let cachedData = null;

export async function update_file_explorer(id) {
    try {
        let items = cachedData;

        // Sinon, on charge le fichier JSON et on met en cache les données
        if (!items) {
            const response = await fetch('data.json');
            items = await response.json();
            cachedData = items; // Mettre en cache les données
        }
        const { folders, files } = items; // Déstructurer les dossiers et fichiers
        
        const list_folder = document.getElementById(`list_folder_contener_${id}`);
        
        if (!list_folder) {
            console.error(`L'élément avec l'ID list_folder_contener_${id} n'a pas été trouvé.`);
            return;
        }

        list_folder.innerHTML = ''; // Nettoie l'affichage avant mise à jour
        
        // Séparer les dossiers selon leur parent_id
        const foldersWithParentId3 = folders.filter(folder => folder.parent_id === 3);
        const foldersWithNullParentId = folders.filter(folder => folder.parent_id === null);

        // Identifier 'home' et 'bin'
        const homeFolder = foldersWithParentId3.find(folder => folder.name === 'Home');
        const binFolder = foldersWithParentId3.find(folder => folder.name === 'Bin');
        const otherFolders = foldersWithParentId3.filter(folder => folder.name !== 'Home' && folder.name !== 'Bin');

        // Ajouter 'home' en premier s'il existe
        if (homeFolder) {
            list_folder.appendChild(createItemElement('folder', homeFolder.name));
        }

        // Ajouter 'bin' ensuite s'il existe
        if (binFolder) {
            list_folder.appendChild(createItemElement('folder', binFolder.name));
        }

        // Ajouter la div 'space'
        const spaceDiv = document.createElement('div');
        spaceDiv.className = 'space';
        list_folder.appendChild(spaceDiv);

        // Ajouter les autres dossiers avec parent_id = 3
        otherFolders.forEach(folder => list_folder.appendChild(createItemElement('folder', folder.name)));

        // Ajouter une deuxième div 'space'
        const spaceDiv2 = document.createElement('div');
        spaceDiv2.className = 'space';
        list_folder.appendChild(spaceDiv2);

        // Ajouter les dossiers avec parent_id = null
        foldersWithNullParentId.forEach(folder => list_folder.appendChild(createItemElement('folder', folder.name)));

    } catch (err) {
        console.error('Erreur lors de la mise à jour de l’explorateur de fichiers:', err);
    }
}

export async function openFolders(id) {
    console.log(id);
    const tab = document.getElementById(`file_explorer_${id}`);
    const innerFoldersContainer = document.getElementById(`inner_folders_${id}`);
    
    if (!innerFoldersContainer) {
        console.error(`L'élément avec l'ID inner_folders_${id} n'a pas été trouvé.`);
        return;
    }
    

    tab.addEventListener('click', async (e) => {
        if (e.target.className === 'folder' && !e.target.id.includes('.')) {
            const folderId = e.target.id;
            console.log(`Dossier cliqué : ${folderId}`);

            try {
                innerFoldersContainer.innerHTML = '';
                let items = cachedData;

                // Sinon, on charge le fichier JSON et on met en cache les données
                if (!items) {
                    const response = await fetch('data.json');
                    items = await response.json();
                    cachedData = items; // Mettre en cache les données
                }
                const { folders, files } = items; // Déstructurer les dossiers et fichiers

                const folder = folders.find(f => f.name === folderId);
                if (!folder) {
                    console.error(`Aucun dossier trouvé avec le nom : ${folderId}`);
                    return;
                }
                updateBar(id, folder, folders);
                returnButton(id, folder, folders, files)
                const childFolders = folders.filter(f => f.parent_id === folder.id);
                const childFiles = files.filter(f => f.folder_id === folder.id);

                childFolders.forEach(folder => innerFoldersContainer.appendChild(createItemElement('folder', folder.name)));
                childFiles.forEach(file => innerFoldersContainer.appendChild(createItemElement('file', file.name, file.extension)));

            } catch (err) {
                console.error('Erreur lors de la récupération des fichiers :', err);
            }
        }
    });
}

export async function openShortcut(id, id2) {
    try {
        const innerFoldersContainer = document.getElementById(`inner_folders_${id2}`);
        if (!innerFoldersContainer) {
            console.error(`L'élément avec l'ID inner_folders_${id2} n'a pas été trouvé.`);
            return;
        }

        let items = cachedData;

        // Sinon, on charge le fichier JSON et on met en cache les données
        if (!items) {
            const response = await fetch('data.json');
            items = await response.json();
            cachedData = items; // Mettre en cache les données
        }
        const { folders, files } = items; // Déstructurer les dossiers et fichiers

        const foundFolder = folders.find(folder => folder.name === id);
        if (!foundFolder) {
            console.log('Dossier non trouvé pour l\'id donné:', id);
            return;
        }

        // Mettre à jour la barre et le bouton de retour
        updateBar(id2, foundFolder, folders);
        returnButton(id2, foundFolder, folders, files);

        // Filtrer les sous-dossiers et fichiers pour ce dossier
        const childFolders = folders.filter(folder => folder.parent_id === foundFolder.id);
        const childFiles = files.filter(file => file.folder_id === foundFolder.id);

        // Ajouter les sous-dossiers et fichiers à l'élément correspondant
        childFolders.forEach(folder => innerFoldersContainer.appendChild(createItemElement('folder', folder.name)));
        childFiles.forEach(file => innerFoldersContainer.appendChild(createItemElement('file', file.name, file.extension)));

    } catch (err) {
        console.error('Erreur lors de la récupération des fichiers :', err);
    }
}


export async function updateBar(id, folder, folders) {
  try {
      const folder_name_text = document.getElementById(`folder_name_text_${id}`);
      const search_bar_text = document.getElementById(`search_bar_text_${id}`);

      folder_name_text.textContent = folder.name;
      search_bar_text.textContent = createPath(folder, folders);



  } catch (err) {
      console.error('Erreur lors de la récupération des fichiers :', err);
  }
}

export function createPath(folder, folders) {
  let path = folder.name;
  let currentFolder = folder;

  while (currentFolder.parent_id !== null) {
      currentFolder = folders.find(f => f.id === currentFolder.parent_id);
      if (!currentFolder) break; // Sécurité si l'ID parent n'existe pas
      path = `${currentFolder.name}/${path}`;
  }

  return path;
}

export function returnButton(id, folder, folders, files) {
  const returnButton = document.getElementById(`return_explorer_${id}`);

  if (!returnButton) {
      console.error(`L'élément avec l'ID return_explorer_${id} n'a pas été trouvé.`);
      return;
  }

  returnButton.addEventListener('click', async () => {
      if (folder.parent_id !== null) {
          // Trouver le dossier parent
          const parentFolder = folders.find(f => f.id === folder.parent_id);
          if (parentFolder) {
              // Mettre à jour la barre avec le dossier parent
              updateBar(id, parentFolder, folders);

              // Vider le contenu des dossiers intérieurs
              const innerFoldersContainer = document.getElementById(`inner_folders_${id}`);
              innerFoldersContainer.innerHTML = '';

              // Charger les sous-dossiers et fichiers du dossier parent
              const childFolders = folders.filter(f => f.parent_id === parentFolder.id);
              const childFiles = files.filter(f => f.folder_id === parentFolder.id);

              // Ajouter les dossiers enfants et fichiers au conteneur
              childFolders.forEach(folder => innerFoldersContainer.appendChild(createItemElement('folder', folder.name)));
              childFiles.forEach(file => innerFoldersContainer.appendChild(createItemElement('file', file.name, file.extension)));
          }
      }
  });
}


export function createItemElement(type, name, extension = '') {
  const element = document.createElement('div');
  element.className = 'folder';
  element.id = name;

  const img = document.createElement('img');
  if(name == 'Documents' || name =='Home' || name =='Bin' || name =='Downloads' || name =='Images' ||name =='Musics' ||name =='Desktop'){
    img.src = `img/${name}.png`
  }
  else img.src = type === 'folder' ? 'img/directory.png' : `img/${extension}.png`;

  const anchor = document.createElement('p');
  anchor.textContent = name;

  element.appendChild(img);
  element.appendChild(anchor);

  return element;
}


export async function loadTextFile(id) {
    const textArea = document.getElementById(`text_${id}`);
    if (!textArea) {
        console.error(`Le textarea avec l'ID text_${id} n'a pas été trouvé.`);
        return;
    }

    try {
        console.log(id);
        const response = await fetch(`img/txt/${id.replace('txt_tab', '')}.txt`);
        if (!response.ok) {
            throw new Error(`Impossible de charger le fichier img/${id}.txt`);
        }

        const text = await response.text();
        textArea.value = text; // Affiche le contenu dans le textarea
    } catch (error) {
        console.error("Erreur lors du chargement du fichier texte:", error);
    }
}

export function startLoadingAnimation(id, path) {
    const textArea = document.getElementById(`loading_url_${id}`);
    if (!textArea) return; // Sécurité : ne fait rien si l'ID n'existe pas

    let progress = 0;
    const totalDuration = 1500;
    const interval = 15;
    const totalSteps = totalDuration / interval;
    const barLength = 30;

    const updateLoading = setInterval(() => {
      if (progress <= totalSteps) {
        updateTextArea(textArea, progress, totalSteps, barLength, id);
        progress += 1;
      } else {
        clearInterval(updateLoading);
        redirectTo(id, path);
      }
    }, interval);
  }
  
  function updateTextArea(textArea, progress, totalSteps, barLength, id) {
    const dots = ['.', '..', '...'][progress % 3]; // Animation des points
    const fillCount = Math.floor((progress / totalSteps) * barLength); // Nombre de '#' remplis
    const emptyCount = barLength - fillCount; // Espaces restants
    const percentage = Math.floor((progress / totalSteps) * 100); // Progression en %
  
    const loadingText = `Redirection${dots}  [${"#".repeat(fillCount)}${" ".repeat(emptyCount)}] ${percentage}%`;

    const asciiArtLinkedin = 
    `###+++                
###+-+#               
 #####                
###+++###+++#++++++#  
###+-+###++++++++-.-+ 
###+-+###++-+###++--+#
###+-+###+--#  ##+---#
###+-+###+--#  ##+---#
###+-+###+--#  ##+---#
###+-+###+--#  ##+---#
###+++###+++#  ##++-+#
#############   ######
    `;

    const asciiArtGithub = 
    `     ++++++#++++      
   #++###    ###+++   
 ++#+           ##++  
 +## ##+#+#++##+  ##+ 
+#+  #####++++++   ##+
#+  #######++++++   #+
#+  ##########+++   #+
+#+ + ##########   #++
 ++ ### ###++     ##++
 ++++##+####++   ##+# 
   ###+#####++###++   
     +######+++++         
    `
        const asciiArtSpirale = 
    `            ===============     
     ===+%@@      %@%*==    
   ===+@   =========        
  ==+% ===+#@%***%@*===     
 ==+#  =+#@==+***+==#*===   
 ===  ==# =+%%===*%+=+*===  
 === === ==+ ===+==+== *==  
 *==  ==  +==%%%==+=== ===  
  +== *+== %++++*%==*# ===  
  #*== #+===    ==+*% ==*#  
   #*+== #*+++++*#   ==+#   
     %*===         ===#@    
        **+=======+**#      
            @@@@@                
    `


    if (id.includes("Github")) {
        textArea.value = asciiArtGithub + "\n" + loadingText + "\n";
    } else if (id.includes("Linkedin")) {
        textArea.value = asciiArtLinkedin + "\n" + loadingText + "\n";
    }else if (id.includes("Spirale")) {
        textArea.value = asciiArtSpirale + "\n" + loadingText + "\n";
    }
  
    
  }
  
  function redirectTo(id, path) {
    const tabElement = document.getElementById(id);
    const iconElement = document.getElementById(`${id.replace('_tab', '')}_icon`);
    console.log(id);
    if (tabElement) {
        tabElement.remove(); 
        iconElement.remove();
    }
    window.open(path, '_blank');
}

//images
export function setupZoomAndDrag(id) {
  const slider = document.getElementById(`scaleSlider_${id}`);
  const image = document.getElementById(`image_${id}`);
  const container = document.getElementById(`content_${id}`);

  let scale = 1;
  let posX = 0, posY = 0;
  let isDragging = false;
  let startX, startY;
  let initialDistance = 0;
  let initialScale = 1;

  if (slider && image && container) {
    image.addEventListener("dragstart", (event) => event.preventDefault());

    slider.addEventListener("input", () => {
      scale = parseFloat(slider.value);
      updateTransform();
    });

    container.addEventListener("wheel", (event) => {
      event.preventDefault();
      const zoomSpeed = 0.1;
      const rect = image.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left) / rect.width;
      const offsetY = (event.clientY - rect.top) / rect.height;
      const oldScale = scale;
      scale += event.deltaY < 0 ? zoomSpeed : -zoomSpeed;
      scale = Math.min(Math.max(scale, 0.1), 2);
      posX -= (offsetX - 0.5) * image.width * (scale - oldScale);
      posY -= (offsetY - 0.5) * image.height * (scale - oldScale);
      updateTransform();
      slider.value = scale;
    });

    image.addEventListener("mousedown", (event) => {
      isDragging = true;
      startX = event.clientX - posX;
      startY = event.clientY - posY;
    });

    document.addEventListener("mousemove", (event) => {
      if (!isDragging) return;
      posX = event.clientX - startX;
      posY = event.clientY - startY;
      updateTransform();
    });

    document.addEventListener("mouseup", () => isDragging = false);

    // Gestion du tactile
    let lastTouch = null;
    container.addEventListener("touchstart", (event) => {
      if (event.touches.length === 1) {
        isDragging = true;
        lastTouch = event.touches[0];
      } else if (event.touches.length === 2) {
        isDragging = false;
        initialDistance = getDistance(event.touches[0], event.touches[1]);
        initialScale = scale;
      }
    });

    container.addEventListener("touchmove", (event) => {
      event.preventDefault();
      if (event.touches.length === 1 && isDragging) {
        let touch = event.touches[0];
        posX += touch.clientX - lastTouch.clientX;
        posY += touch.clientY - lastTouch.clientY;
        lastTouch = touch;
        updateTransform();
      } else if (event.touches.length === 2) {
        let newDistance = getDistance(event.touches[0], event.touches[1]);
        scale = Math.min(Math.max(initialScale * (newDistance / initialDistance), 0.1), 2);
        updateTransform();
        slider.value = scale;
      }
    });

    container.addEventListener("touchend", () => isDragging = false);

    function getDistance(touch1, touch2) {
      return Math.sqrt((touch1.clientX - touch2.clientX) ** 2 + (touch1.clientY - touch2.clientY) ** 2);
    }

    function updateTransform() {
      image.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    }
  }
}

export function setupResizeObserver(id) {
  const container = document.getElementById(`content_${id}`);
  const image = document.getElementById(`image_${id}`);

  if (container && image) {
    const resizeObserver = new ResizeObserver(() => {
      centerImage();
    });

    resizeObserver.observe(container);
  }

  function centerImage() {
    image.style.left = "50%";
    image.style.top = "50%";
    image.style.transform = `translate(-50%, -50%) scale(1)`;
  }
}


  
  

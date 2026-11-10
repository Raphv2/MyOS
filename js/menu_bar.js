const swup = window.swup;

import * as t  from './tab.js';

export function tab(offSetX, offSetY, height, width, isMobile) {
  
  if(!isMobile) t.enableDrag2("new-square", offSetX, offSetY);


  const observer = new MutationObserver(() => {
    const screen = document.querySelector('.screen');
    const rectangularBar = document.querySelector('.rectangular-bar');
    if (screen && rectangularBar) {
      observer.disconnect(); 
      openFiles(rectangularBar, screen, width, height, isMobile);
      t.IndexClickApplication('application', rectangularBar);
      t.OpenApplicationTarget(rectangularBar);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

export function openFiles(rectangularBar, screen, width, height, isMobile) {
  let lastClickTime = 0;
 

  const handleClick = async (e) => {
    let menuItem = e.target.closest('.menu_item, .spirale');
    let num;

    if (menuItem) {
      if (menuItem.id.includes(".")) {
        console.log("La chaîne contient un point.");

        const extension = menuItem.id.split(".")[1];
        const appName = menuItem.id.replace('.', '');
        const app = menuItem.id;
        console.log(app + ' ' + ' ' + extension + ' ' + appName)

        const createFunctionMap = {
          png: t.createPictureSquare,
          blend: t.create3DSquare,
          pdf: t.createPDFSquare,
          txt: t.createTextSquare,
          mp3: t.createMusicSquare,
          glsl: t.createGLSLSquare
        };
        
        if (createFunctionMap[extension]) {
          try {
            createFunctionMap[extension](
              screen,
              `${appName}_tab`,  // Ajout des guillemets pour la chaîne interpolée
              `${appName}_icon`,
              `${appName}_border_inner_contener`,
              `${appName}_inner_contener`,
              '',
              width,
              height,
              app
            );
            console.log("Ouvert extension:", app);
          } catch (error) {
            console.error("Erreur lors de la création de la fenêtre :", error);
            num++;
            t.createErrorSquare(screen, `error${num}_tab`, '', `id_error${num}_border_inner_contener`, `id_error${num}_inner_contener`, '', '30', '20', 'error');
          }
        } else {
          try {
            if (appName.replace('exe', '') == 'Github') {
              t.createOtherSquare(
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
              console.log("Ouvert exe:", app);
            } else if (appName.replace('exe', '') == 'Linkedin') {
              t.createOtherSquare(
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
              console.log("Ouvert exe:", app);
            }else if (appName.replace('exe', '') == 'Spirale') {
            t.createOtherSquare(
              screen,
              `${appName}_tab`,
              `${appName}_icon`,
              `${appName}_border_inner_contener`,
              `${appName}_inner_contener`,
              '',
              width,
              height,
              app,
              isMobile 
              ? "intent://send/?to=raphaelgosset.pro@gmail.com&subject=Demande%20de%20contact#Intent;scheme=mailto;package=com.google.android.gm;end"
              : `https://mail.google.com/mail/?view=cm&fs=1&to=raphaelgosset.pro@gmail.com&su=Demande%20de%20contact`
            );
            console.log("Ouvert :", app);
          }
            t.createSquare(
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
            console.log("Ouvert random:", app);
          } catch (error) {
            console.error("Erreur lors de l'ouverture du fichier :", error);
            num++;
            t.createErrorSquare(screen, `error${num}_tab`, '', `id_error${num}_border_inner_contener`, `id_error${num}_inner_contener`, '', '30', '20', 'error');
          }
        }
        
        if (extension !== 'exe') {
          t.createDiv(`${appName}_icon`, "application", '', rectangularBar, `img/${extension}.png`, '', '');
        } else {
          t.createDiv(`${appName}_icon`, "application", '', rectangularBar, `img/${appName.replace(extension, '').toLowerCase()}.png`, '', '');
        }

      } else {
        t.createExplorerSquare(screen, `${menuItem.id}_tab`, `id_${menuItem.id}_icon`, `id_${menuItem.id}_border_inner_contener`, `id_${menuItem.id}_inner_contener`, '', width, height, 'file explorer');
        t.createDiv(`id_${menuItem.id}_icon`, "application", '', rectangularBar, 'img/directory.png', '', '');
      }
      console.log('menuitem', menuItem);
      if(menuItem.id !== 'Spirale.exe') t.addRecentFiles(menuItem);
    }
  };
  if (isMobile) {
    document.addEventListener('touchstart', function (e) {//empecher le zoom
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - lastClickTime;

      if (timeDiff < 300 && timeDiff > 0) {
        e.preventDefault();
      }
        lastClickTime = currentTime;
    }, { passive: false });
    
    document.addEventListener('touchend', handleClick, { passive: true });
  } else {
    document.addEventListener('dblclick', handleClick);//PC
  }

}








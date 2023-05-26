console.clear();
function $(selector) {
  return document.querySelector(selector);
}

/* Basic example */

const parentBasic = $('#basic'),
  popupBasic = new Picker(parentBasic);
popupBasic.onChange = function (color) {
  parentBasic.style.backgroundColor = color.rgbaString;
};
//Open the popup manually:
popupBasic.openHandler();

/* More options */

const parentCustom = $('#custom'),
  popupCustom = new Picker({
    parent: parentCustom,
    popup: 'top',
    color: 'violet',
    //alpha: false,
    //editor: false,
    editorFormat: 'rgb',
    onDone: function (color) {
      parentCustom.style.backgroundColor = color.rgbaString;
    },
  });

/* Shared picker */

const parentShared = $('#shared'),
  parentBG = $('#color-bg'),
  popupShared = new Picker({
    popup: 'top',
    onChange: function (color) {
      this.settings.parent.setAttribute('data-color', color.rgbaString);
      updateBackground();
    },
  });

//Picker switching:
parentShared.addEventListener('click', function (e) {
  if (e.target.nodeName !== 'A') {
    return;
  }
  e.preventDefault();
  const parent = e.target;

  popupShared.movePopup(
    {
      parent: parent,
      color: parent.getAttribute('data-color'),
      //Future feature...
      //alpha: (parent !== parentBG),
    },
    true
  );
});

//Color handling:
function updateBackground() {
  function updateElement(elm) {
    const color = (elm.style.color = elm.getAttribute('data-color'));
    return color;
  }

  const body = document.body,
    c1 = updateElement($('#color-line1')),
    c2 = updateElement($('#color-line2')),
    patternSize = 200,
    pattern = `repeating-linear-gradient( 0deg, transparent 0, transparent ${
      patternSize * 0.6
    }px, ${c2} 0, ${c2} ${
      patternSize * 0.8
    }px, transparent 0, transparent ${patternSize}px),
                     repeating-linear-gradient(90deg, transparent 0, transparent ${
                       patternSize * 0.6
                     }px, ${c2} 0, ${c2} ${
      patternSize * 0.8
    }px, transparent 0, transparent ${patternSize}px),
                     repeating-linear-gradient( 0deg, ${c1} 0, ${c1} ${
      patternSize * 0.4
    }px, transparent 0, transparent ${patternSize}px),
                     repeating-linear-gradient(90deg, ${c1} 0, ${c1} ${
      patternSize * 0.4
    }px, transparent 0, transparent ${patternSize}px)`;

  parentShared.style.backgroundColor = updateElement(parentBG);
  parentShared.style.backgroundImage = pattern;
}
updateBackground();

/* Fixed picker */

const parentFixed = $('#fixed'),
  pickerFixed = new Picker({
    parent: parentFixed,
    popup: false,
    alpha: false,
    editor: false,
    color: 'orangered',
    onChange: function (color) {
      parentFixed.style.backgroundColor = color.rgbaString;
    },
  });
//Set the color silently (doesn't trigger .onChange()):
pickerFixed.setColor('lime', true);

/* Disable normal link navigation */

[parentBasic, parentCustom].forEach((p) => {
  p.addEventListener('click', function (e) {
    e.preventDefault();
  });
});

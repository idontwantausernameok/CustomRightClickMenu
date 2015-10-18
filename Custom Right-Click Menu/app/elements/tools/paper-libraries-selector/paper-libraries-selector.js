Polymer({
	is: 'paper-libraries-selector',

	properties: {
		/**
		 * The libraries currently in use by the script
		 *
		 * @attribute usedlibraries
		 * @type Array
		 * @default null
		 */
		usedlibraries: {
			type: Array,
			notify: true
		},
		/**
		 * The libraries for use in the HTML, already marked up
		 *
		 * @attribute libraries
		 * @type Array
		 * @default null
		 */
		libraries: {
			type: Array,
			notify: true
		},
		/**
		 * The currently selected (used) libraries' indexes
		 *
		 * @attribute selected
		 * @type Array
		 * @default null
		 */
		selected: {
			type: Array,
			notify: true
		},
		/**
		 * The libraries installed in the extension
		 *
		 * @attribute installedLibraries
		 * @type Array
		 * @default null
		 */
		installedLibraries: {
			type: Array
		}
	},

	ready: function() {
		var _this = this;
		chrome.storage.local.get('libraries', function(keys) {
			_this.installedLibraries = keys.libraries;
		});
		chrome.storage.onChanged.addListener(function(changes, areaName) {
			if (areaName === 'local' && changes.libraries) {
				_this.installedLibraries = changes.libraries.newValue;
			}
		});
	},
	
	init: function() {
		var _this = this;
		var selectedObj = {};
		this.usedlibraries.forEach(function(item) {
			selectedObj[item.name] = true;
		});
		var libraries = [];
		var selected = [];
		var itemCopy;
		_this.installedLibraries.forEach(function(item) {
			itemCopy = {};
			itemCopy.name = item.name;
			itemCopy.isLibrary = true;
			if (selectedObj[item.name]) {
				itemCopy.classes = 'library iron-selected';
				itemCopy.selected = 'true';
			}
			else {
				itemCopy.classes = 'library';
				itemCopy.selected = 'false';
			}
			libraries.push(itemCopy);
		});
		libraries.sort(function(first, second) {
			return first.name[0].toLowerCase().charCodeAt(0) - second.name[0].toLowerCase().charCodeAt(0);
		});
		libraries.forEach(function(item, index) {
			if (item.selected === 'true') {
				selected.push(index);
			}
		});
		_this.selected = selected;
		libraries.push({
			name: 'Add your own',
			classes: 'library addLibrary',
			selected: 'false',
			isLibrary: false
		});
		_this.libraries = libraries;
	},

	confirmLibraryFile: function (_this, name, code, url) {
		window.doc.addLibraryProcessContainer.style.display = 'none';
		window.doc.addLibraryLoadingDialog.style.display = 'flex';
		setTimeout(function() {
			window.doc.addLibraryConfirmationInput.value = code;
			window.doc.addLibraryConfirmAddition.addEventListener('click', function () {
				window.doc.addLibraryConfirmationInput.value = '';
				_this.addLibraryFile(_this, name, code);
			});
			window.doc.addLibraryDenyConfirmation.addEventListener('click', function() {
				window.doc.addLibraryConfirmationContainer.style.display = 'none';
				window.doc.addLibraryProcessContainer.style.display = 'block';
				window.doc.addLibraryConfirmAddition.removeEventListener('click');
				window.doc.addLibraryDenyConfirmation.removeEventListener('click');
				window.doc.addLibraryUrlInput.removeAttribute('invalid');
				window.doc.addLibraryConfirmationInput.value = '';
			});
			window.doc.addLibraryLoadingDialog.style.display = 'none';
			window.doc.addLibraryConfirmationContainer.style.display = 'block';
		}, 250);
	},

	addLibraryFile: function (_this, name, code) {
		window.doc.addLibraryConfirmationContainer.style.display = 'none';
		window.doc.addLibraryLoadingDialog.style.display = 'flex';
		setTimeout(function() {
			_this.installedLibraries.push({
				name: name,
				code: code
			});
			chrome.storage.local.set({ libraries: _this.installedLibraries });
			chrome.runtime.sendMessage({
				update: true,
				type: 'updateLibraries'
			});
			_this.splice('libraries', _this.libraries.length - 1, 0, {
				name: name,
				classes: 'library iron-selected',
				selected: 'true',
				isLibrary: 'true'
			});

			var dropdownContainer = $(_this).find('.content');
			dropdownContainer.animate({
				height: dropdownContainer.scrollHeight
			}, {
				duration: 250,
				easing: 'easeInCubic'
			});

			window.doc.addLibraryLoadingDialog.style.display = 'none';
			window.doc.addLibraryConfirmationContainer.style.display = 'none';
			window.doc.addLibraryProcessContainer.style.display = 'none';
			window.doc.addLibraryDialogSucces.style.display = 'block';
			window.doc.addLibraryDialogSuccesCheckmark.style.display = 'none';
			$(window.doc.addLibraryDialogSucces).animate({
				backgroundColor: 'rgb(38,153,244)'
			}, {
				duration: 300,
				easing: 'easeOutCubic',
				complete: function () {
					window.doc.addLibraryDialogSuccesCheckmark.style.display = 'block';
					window.doc.addLibraryDialogSuccesCheckmark.classList.add('animateIn');
					setTimeout(function() {
						window.doc.addLibraryDialog.toggle();
						window.doc.addLibraryDialogSucces.style.display = 'none';
						window.doc.addLibraryLoadingDialog.style.display = 'block';
					}, 2500);
				}
			});
		}, 250);
	},

	click: function (e) {
		var _this = this;
		if (e.target.classList.contains('addLibrary')) {
			//Add new library dialog
			window.doc.addedLibraryName.value = '';
			window.doc.addLibraryUrlInput.value = '';
			window.doc.addLibraryManualInput.value = '';
			window.doc.addLibraryDialog.toggle();
			$(window.doc.addLibraryDialog)
				.find('#addLibraryButton')
				.on('click', function () {
					var name = window.doc.addedLibraryName.value;
					var taken = false;
					for (var i = 0; i < _this.installedLibraries.length; i++) {
						if (_this.installedLibraries[i].name === name) {
							taken = true;
						}
					}
					if (name !== '' && !taken) {
						this.removeAttribute('invalid');
						if (window.doc.addLibraryRadios.selected === 'url') {
							var libraryInput = window.doc.addLibraryUrlInput;
							var url = libraryInput.value;
							if (url[0] === '/' && url[1] === '/') {
								url = 'http:' + url;
							}
							$.ajax({
								url: url,
								dataType: 'html'
							}).done(function(data) {
								_this.confirmLibraryFile(_this, name, data, url);
							}).fail(function() {
								libraryInput.setAttribute('invalid', 'true');
							});
						} else {
							_this.addLibraryFile(_this, name, window.doc.addLibraryManualInput.value);
						}
					} else {
						if (taken) {
							window.doc.addedLibraryName.errorMessage = 'That name is already taken';
						} else {
							window.doc.addedLibraryName.errorMessage = 'Please enter a name';
						}
						window.doc.addedLibraryName.invalid = true;
					}
				});
		}
	},

	behaviors: [Polymer.PaperDropdownBehavior]
});
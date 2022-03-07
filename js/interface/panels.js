class Panel {
	constructor(id, data) {
		if (!data) data = id;
		let scope = this;
		this.type = 'panel';
		this.id = typeof id == 'string' ? id : data.id || 'new_panel';
		this.name = tl(data.name ? data.name : `panel.${this.id}`);
		this.icon = data.icon;
		this.menu = data.menu;
		this.condition = data.condition;
		this.display_condition = data.display_condition;
		this.previous_slot = 'left_bar';

		this.growable = data.growable;
		this.selection_only = data.selection_only == true;
		this.folded = false;

		this.onResize = data.onResize;
		this.onFold = data.onFold;
		this.toolbars = data.toolbars || {};

		if (!Interface.data.panels[this.id]) Interface.data.panels[this.id] = {};
		this.position_data = Interface.data.panels[this.id];
		let defaultp = data.default_position || 0;
		if (!this.position_data.slot) 			this.position_data.slot 			= defaultp.slot || (data.default_side ? (data.default_side+'_bar') : 'left_bar');
		if (!this.position_data.float_position)	this.position_data.float_position 	= defaultp.float_position || [0, 0];
		if (!this.position_data.float_size) 	this.position_data.float_size 		= defaultp.float_size || [300, 300];
		if (!this.position_data.height) 		this.position_data.height 			= defaultp.height || 300;

		this.handle = Interface.createElement('h3', {class: 'panel_handle'}, Interface.createElement('label', {}, Interface.createElement('span', {}, this.name)));
		this.node = Interface.createElement('div', {class: 'panel', id: `panel_${this.id}`}, this.handle);

		if (this.selection_only) this.node.classList.add('selection_only');
		if (this.growable) this.node.classList.add('grow');
		
		// Toolbars
		for (let key in this.toolbars) {
			let toolbar = this.toolbars[key];
			if (toolbar instanceof Toolbar) {
				if (toolbar.label) {
					let label = Interface.createElement('p', {class: 'panel_toolbar_label'}, tl(toolbar.name));
					this.node.append(label);
				}
				this.node.append(toolbar.node);
			}
		}

		if (data.component) {
			
			let component_mount = Interface.createElement('div');
			this.node.append(component_mount);
			let onmounted = data.component.mounted;
			data.component.mounted = function() {
				Vue.nextTick(() => {

					let toolbar_wrappers = this.$el.querySelectorAll('.toolbar_wrapper');
					toolbar_wrappers.forEach(wrapper => {
						let id = wrapper.attributes.toolbar && wrapper.attributes.toolbar.value;
						let toolbar = scope.toolbars[id];
						if (toolbar) {
							wrapper.append(toolbar.node);
						}
					})

					if (typeof onmounted == 'function') {
						onmounted.call(this);
					}
					//updateInterfacePanels()
				})
			}
			this.vue = this.inside_vue = new Vue(data.component).$mount(component_mount);	
			scope.vue.$el.classList.add('panel_vue_wrapper');		
		}

		if (!Blockbench.isMobile) {

			let snap_button = Interface.createElement('div', {class: 'tool panel_control'}, Blockbench.getIconNode('drag_handle'))
			this.handle.append(snap_button);
			snap_button.addEventListener('click', (e) => {
				new Menu([
					{
						name: 'Left Sidebar',
						icon: 'align_horizontal_left',
						click: () => this.moveTo('left_bar')
					},
					{
						name: 'Right Sidebar',
						icon: 'align_horizontal_right',
						click: () => this.moveTo('right_bar')
					},
					{
						name: 'Top',
						icon: 'align_vertical_top',
						click: () => this.moveTo('top')
					},
					{
						name: 'Bottom',
						icon: 'align_vertical_bottom',
						click: () => this.moveTo('bottom')
					},
					{
						name: 'Float',
						icon: 'web_asset',
						click: () => this.moveTo('float')
					}
				]).show(snap_button);
			})

			let fold_button = Interface.createElement('div', {class: 'tool panel_control panel_folding_button'}, Blockbench.getIconNode('expand_more'))
			this.handle.append(fold_button);
			fold_button.addEventListener('click', (e) => {
				this.fold();
			})

			this.handle.firstElementChild.addEventListener('dblclick', e => {
				this.fold();
			})



			addEventListeners(this.handle.firstElementChild, 'mousedown touchstart', e1 => {
				convertTouchEvent(e1);
				let started = false;
				let position_before = this.slot == 'float'
					? this.position_data.float_position.slice()
					: [e1.clientX - e1.offsetX, e1.clientY - e1.offsetY - 55];

				let drag = e2 => {
					convertTouchEvent(e2);
					if (!started && (Math.pow(e2.clientX - e1.clientX, 2) + Math.pow(e2.clientX - e1.clientX, 2)) > 15) {
						started = true;
						if (this.slot !== 'float') {
							this.moveTo('float');
							this.moveToFront();
						}
					}
					if (!started) return;
					
					this.position_data.float_position[0] = position_before[0] + e2.clientX - e1.clientX;
					this.position_data.float_position[1] = position_before[1] + e2.clientY - e1.clientY;

					let threshold = -5;
					let center_x = this.position_data.float_position[0] + this.position_data.float_size[0]/2;
					if (this.position_data.float_position[0] < threshold) {
						let panels = [];
						Interface.left_bar.childNodes.forEach(child => {
							if (child.clientHeight) {
								panels.push(child.id.replace(/^panel_/, ''));
							}
						})
						let anchor = this.position_data.float_position[1];
						anchor += this.node.clientHeight * ((this.position_data.float_position[1] + this.position_data.float_size[1]) / Interface.work_screen.clientHeight);
						let index = Math.floor(Math.clamp(anchor / Interface.work_screen.clientHeight, 0, 1) * (panels.length));
						this.moveTo('left_bar', Panels[panels[Math.clamp(index, 0, panels.length-1)]], index < panels.length);

					} else if (this.position_data.float_position[0] + Math.min(this.position_data.float_size[0], Interface.data.right_bar_width) > document.body.clientWidth - threshold) {
						let panels = [];
						Interface.right_bar.childNodes.forEach(child => {
							if (child.clientHeight) {
								panels.push(child.id.replace(/^panel_/, ''));
							}
						})
						let anchor = this.position_data.float_position[1];
						anchor += this.node.clientHeight * ((this.position_data.float_position[1] + this.position_data.float_size[1]) / Interface.work_screen.clientHeight);
						let index = Math.floor(Math.clamp(anchor / Interface.work_screen.clientHeight, 0, 1) * (panels.length));
						this.moveTo('right_bar', Panels[panels[Math.clamp(index, 0, panels.length-1)]], index < panels.length);

					} else if (
						this.position_data.float_position[1] < threshold &&
						center_x > Interface.left_bar_width && center_x < (Interface.work_screen.clientWidth - Interface.right_bar_width)
					) {
						if (this.slot == 'float') this.moveTo('top');

					} else if (
						this.position_data.float_position[1] + Math.min(this.position_data.float_size[1], 200) > Interface.work_screen.clientHeight - threshold &&
						center_x > Interface.left_bar_width && center_x < (Interface.work_screen.clientWidth - Interface.right_bar_width)
					) {
						if (this.slot == 'float') this.moveTo('bottom');

					} else if (this.slot != 'float') {
						this.moveTo('float');
					}

					this.update(true);

				}
				let stop = e2 => {
					convertTouchEvent(e2);

					if (this.slot != 'float') {
						this.position_data.float_position[0] = position_before[0];
						this.position_data.float_position[1] = position_before[1];
					}
					this.update();
					saveSidebarOrder()
					updateInterface()
					
					removeEventListeners(document, 'mousemove touchmove', drag);
					removeEventListeners(document, 'mouseup touchend', stop);
				}
				addEventListeners(document, 'mousemove touchmove', drag);
				addEventListeners(document, 'mouseup touchend', stop);

			})
		} else {			

			let close_button = Interface.createElement('div', {class: 'tool panel_control'}, Blockbench.getIconNode('clear'))
			this.handle.append(close_button);
			close_button.addEventListener('click', (e) => {
				Interface.PanelSelectorVue.select(null);
			})
			

			addEventListeners(this.handle.firstElementChild, 'mousedown touchstart', e1 => {
				convertTouchEvent(e1);
				let started = false;
				let height_before = this.position_data.height;
				let max = Blockbench.isLandscape ? window.innerWidth - 50 : Interface.work_screen.clientHeight;

				let drag = e2 => {
					convertTouchEvent(e2);
					let diff = Blockbench.isLandscape ? e1.clientX - e2.clientX : e1.clientY - e2.clientY;
					if (!started && Math.abs(diff) > 4) {
						started = true;
					}
					if (!started) return;
					
					this.position_data.height = Math.clamp(height_before + diff, 140, max);

					this.update(true);
					resizeWindow();

				}
				let stop = e2 => {
					convertTouchEvent(e2);

					this.update();
					
					removeEventListeners(document, 'mousemove touchmove', drag);
					removeEventListeners(document, 'mouseup touchend', stop);
				}
				addEventListeners(document, 'mousemove touchmove', drag);
				addEventListeners(document, 'mouseup touchend', stop);

			})
		}
		this.node.addEventListener('mousedown', event => {
			setActivePanel(this.id);
			this.moveToFront();
		})
		
		
		// Add to slot
		let reference_panel = Panels[data.insert_before || data.insert_after];
		this.moveTo(this.position_data.slot, reference_panel, reference_panel && !data.insert_after);

		Interface.Panels[this.id] = this;
	}
	isVisible() {
		return !this.folded && this.node.parentElement && this.node.parentElement.style.display !== 'none';
	}
	get slot() {
		return this.position_data.slot;
	}
	fold(state = !this.folded) {
		this.folded = !!state;
		let new_icon = Blockbench.getIconNode(state ? 'expand_less' : 'expand_more');
		$(this.handle).find('> .panel_folding_button > .icon').replaceWith(new_icon);
		this.node.classList.toggle('folded', state);
		if (this.onFold) {
			this.onFold();
		}
		if (this.slot == 'top' || this.slot == 'bottom') {
			resizeWindow();
		}
		this.update();
		return this;
	}
	setupFloatHandles() {
		let sides = [
			Interface.createElement('div', {class: 'panel_resize_side resize_top'}),
			Interface.createElement('div', {class: 'panel_resize_side resize_bottom'}),
			Interface.createElement('div', {class: 'panel_resize_side resize_left'}),
			Interface.createElement('div', {class: 'panel_resize_side resize_right'}),
		];
		let corners = [
			Interface.createElement('div', {class: 'panel_resize_corner resize_top_left'}),
			Interface.createElement('div', {class: 'panel_resize_corner resize_top_right'}),
			Interface.createElement('div', {class: 'panel_resize_corner resize_bottom_left'}),
			Interface.createElement('div', {class: 'panel_resize_corner resize_bottom_right'}),
		];
		let resize = (e1, direction_x, direction_y) => {
			let position_before = this.position_data.float_position.slice();
			let size_before = this.position_data.float_size.slice();
			let started = false;

			let drag = e2 => {
				convertTouchEvent(e2);
				if (!started && (Math.pow(e2.clientX - e1.clientX, 2) + Math.pow(e2.clientX - e1.clientX, 2)) > 15) {
					started = true;
				}
				if (!started) return;

				this.position_data.float_size[0] = size_before[0] + (e2.clientX - e1.clientX) * direction_x;
				this.position_data.float_size[1] = size_before[1] + (e2.clientY - e1.clientY) * direction_y;

				if (direction_x == -1) this.position_data.float_position[0] = position_before[0] - this.position_data.float_size[0] + size_before[0];
				if (direction_y == -1) this.position_data.float_position[1] = position_before[1] - this.position_data.float_size[1] + size_before[1];

				if (this.onResize) {
					this.onResize()
				}
				this.update();

			}
			let stop = e2 => {
				convertTouchEvent(e2);
				
				removeEventListeners(document, 'mousemove touchmove', drag);
				removeEventListeners(document, 'mouseup touchend', stop);
			}
			addEventListeners(document, 'mousemove touchmove', drag);
			addEventListeners(document, 'mouseup touchend', stop);
		}
		addEventListeners(sides[0], 'mousedown touchstart', (event) => resize(event, 0, -1));
		addEventListeners(sides[1], 'mousedown touchstart', (event) => resize(event, 0, 1));
		addEventListeners(sides[2], 'mousedown touchstart', (event) => resize(event, -1, 0));
		addEventListeners(sides[3], 'mousedown touchstart', (event) => resize(event, 1, 0));
		addEventListeners(corners[0], 'mousedown touchstart', (event) => resize(event, -1, -1));
		addEventListeners(corners[1], 'mousedown touchstart', (event) => resize(event, 1, -1));
		addEventListeners(corners[2], 'mousedown touchstart', (event) => resize(event, -1, 1));
		addEventListeners(corners[3], 'mousedown touchstart', (event) => resize(event, 1, 1));

		let handles = Interface.createElement('div', {class: 'panel_resize_handle_wrapper'}, [...sides, ...corners]);
		this.node.append(handles);
		this.resize_handles = handles;
		return this;
	}
	moveToFront() {
		if (this.slot == 'float' && Panel.floating_panel_z_order[0] !== this.id) {
			Panel.floating_panel_z_order.remove(this.id);
			Panel.floating_panel_z_order.splice(0, 0, this.id);
			let zindex = 18;
			Panel.floating_panel_z_order.forEach(id => {
				let panel = Panels[id];
				panel.node.style.zIndex = zindex;
				zindex = Math.clamp(zindex-1, 14, 19);
			})
		}
		return this;
	}
	moveTo(slot, ref_panel, before = false) {
		let position_data = this.position_data;
		if (slot == undefined) {
			slot = ref_panel.position_data.slot;
		}
		this.node.classList.remove('floating');

		if (slot == 'left_bar' || slot == 'right_bar') {
			if (!ref_panel && Interface.data[slot].includes(this.id)) {
				let index = Interface.data[slot].indexOf(this.id);
				if (index == 0) {
					ref_panel = Interface.Panels[Interface.data[slot][1]];
					before = true;
				} else {
					ref_panel = Interface.Panels[Interface.data[slot][index-1]];
					before = false;
				}
			}

			if (ref_panel instanceof Panel && ref_panel.slot == slot) {
				if (before) {
					$(ref_panel.node).before(this.node);
				} else {
					$(ref_panel.node).after(this.node);
				}
			} else {
				document.getElementById(slot).append(this.node);
			}

		} else if (slot == 'top') {
			let top_panel = Interface.getTopPanel();
			if (top_panel && top_panel !== this) top_panel.moveTo(top_panel.previous_slot);

			document.getElementById('top_slot').append(this.node);

		} else if (slot == 'bottom') {
			let bottom_panel = Interface.getBottomPanel();
			if (bottom_panel && bottom_panel !== this) bottom_panel.moveTo(bottom_panel.previous_slot);

			document.getElementById('bottom_slot').append(this.node);

		} else if (slot == 'float') {
			Interface.work_screen.append(this.node);
			this.node.classList.add('floating');
			if (!this.resize_handles) {
				this.setupFloatHandles();
			}
		}
		position_data.slot = slot;
		this.update();

		if (Panels[this.id]) {
			// Only update after initial setup
			if (this.onResize) {
				this.onResize()
			}
			saveSidebarOrder()
			updateInterface()
		}
		return this;
	}
	update(dragging) {
		let show = BARS.condition(this.condition);
		let work_screen = document.querySelector('div#work_screen');
		let center_screen = document.querySelector('div#center');
		if (show) {
			$(this.node).show()
			if (this.slot == 'float') {
				if (!dragging && work_screen.clientWidth) {
					this.position_data.float_position[0] = Math.clamp(this.position_data.float_position[0], 0, work_screen.clientWidth - this.width);
					this.position_data.float_position[1] = Math.clamp(this.position_data.float_position[1], 0, work_screen.clientHeight - this.height);
					this.position_data.float_size[0] = Math.clamp(this.position_data.float_size[0], 300, work_screen.clientWidth - this.position_data.float_position[0]);
					this.position_data.float_size[1] = Math.clamp(this.position_data.float_size[1], 300, work_screen.clientHeight - this.position_data.float_position[1]);
				}

				this.node.style.left = this.position_data.float_position[0] + 'px';
				this.node.style.top = this.position_data.float_position[1] + 'px';
				this.width  = this.position_data.float_size[0];
				this.height = this.position_data.float_size[1];
				if (this.folded) this.height = this.handle.clientHeight;
				this.node.style.width = this.width + 'px';
				this.node.style.height = this.height + 'px';
			} else {
				this.node.style.width = this.node.style.height = this.node.style.left = this.node.style.top = null;
			}
			if (Blockbench.isMobile) {
				this.width = this.node.clientWidth;
			} else if (this.slot == 'left_bar') {
				this.width = Interface.data.left_bar_width
			} else if (this.slot == 'right_bar') {
				this.width = Interface.data.right_bar_width
			}
			if (this.slot == 'top' || this.slot == 'bottom') {

				if (Blockbench.isMobile && Blockbench.isLandscape) {
					this.height = center_screen.clientHeight;
					this.width = Math.clamp(this.position_data.height, 30, center_screen.clientWidth);
					if (this.folded) this.width = 72;
				} else {
					this.height = Math.clamp(this.position_data.height, 30, center_screen.clientHeight);
					if (this.folded) this.height = this.handle.clientHeight;
					this.width = Interface.work_screen.clientWidth - Interface.left_bar_width - Interface.right_bar_width;
				}
				this.node.style.width = this.width + 'px';
				this.node.style.height = this.height + 'px';
			}

			if (Panels[this.id] && this.onResize) this.onResize()
		} else {
			$(this.node).hide()
		}
		localStorage.setItem('interface_data', JSON.stringify(Interface.data))
		return this;
	}
	delete() {
		delete Interface.Panels[this.id];
		this.node.remove()
	}
}
Panel.floating_panel_z_order = [];


function setupPanels() {
	Interface.panel_definers.forEach((definer) => {
		if (typeof definer === 'function') {
			definer()
		}
	})
	updateSidebarOrder();
}

function updateInterfacePanels() {

	if (!Blockbench.isMobile) {
		$('.sidebar#left_bar').css('display', Prop.show_left_bar ? 'flex' : 'none');
		$('.sidebar#right_bar').css('display', Prop.show_right_bar ? 'flex' : 'none');
	}
	let work_screen = Interface.work_screen;

	work_screen.style.setProperty(
		'grid-template-columns',
		Interface.data.left_bar_width+'px auto '+ Interface.data.right_bar_width +'px'
	)
	for (var key in Interface.Panels) {
		var panel = Interface.Panels[key]
		panel.update()
	}
	var left_width = $('.sidebar#left_bar > .panel:visible').length ? Interface.left_bar_width : 0;
	var right_width = $('.sidebar#right_bar > .panel:visible').length ? Interface.right_bar_width : 0;

	if (!left_width || !right_width) {
		work_screen.style.setProperty(
			'grid-template-columns',
			left_width+'px auto '+ right_width +'px'
		)
	}

	$('.quad_canvas_wrapper.qcw_x').css('width', Interface.data.quad_view_x+'%')
	$('.quad_canvas_wrapper.qcw_y').css('height', Interface.data.quad_view_y+'%')
	$('.quad_canvas_wrapper:not(.qcw_x)').css('width', (100-Interface.data.quad_view_x)+'%')
	$('.quad_canvas_wrapper:not(.qcw_y)').css('height', (100-Interface.data.quad_view_y)+'%')
	//$('#timeline').css('height', Interface.data.timeline_height+'px')
	for (var key in Interface.Resizers) {
		var resizer = Interface.Resizers[key]
		resizer.update()
	}
}

function updateSidebarOrder() {
	['left_bar', 'right_bar'].forEach(bar => {
		let bar_node = document.querySelector(`.sidebar#${bar}`);

		bar_node.childNodes.forEach(panel_node => panel_node.remove());

		Interface.data[bar].forEach(panel_id => {
			let panel = Panels[panel_id];
			if (panel) bar_node.append(panel.node);
		});
	})
}

function setActivePanel(panel) {
	Prop.active_panel = panel
}

function saveSidebarOrder() {
	localStorage.setItem('interface_data', JSON.stringify(Interface.data))
}

function setupMobilePanelSelector() {
	if (Blockbench.isMobile) {
		Interface.PanelSelectorVue = new Vue({
			el: '#panel_selector_bar',
			data: {
				all_panels: Interface.Panels,
				selected: null,
				modifiers: Pressing.overrides
			},
			computed: {
			},
			methods: {
				panels() {
					let arr = [];
					for (var id in this.all_panels) {
						let panel = this.all_panels[id];
						if (Condition(panel.condition) && Condition(panel.display_condition)) {
							arr.push(panel);
						}
					}
					return arr;
				},
				select(panel) {
					this.selected = panel && panel.id;
					if (panel) {
						panel.moveTo('bottom');
					} else {
						let other_panel = Interface.getBottomPanel();
						if (other_panel) {
							$(other_panel.node).detach();
						}
						resizeWindow();
					}
				},
				openKeyboardMenu(event) {
					if (Menu.closed_in_this_click == 'mobile_keyboard') return;
					
					let modifiers = ['ctrl', 'shift', 'alt'];
					let menu = new Menu('mobile_keyboard', [
						...modifiers.map(key => {
							let name = tl(`keys.${key}`);
							if (Interface.status_bar.vue.modifier_keys[key].length) {
								name += ' (' + tl(Interface.status_bar.vue.modifier_keys[key].last()) + ')';
							}
							return {
								name,
								icon: Pressing.overrides[key] ? 'check_box' : 'check_box_outline_blank',
								click() {
									Pressing.overrides[key] = !Pressing.overrides[key]
								}
							}
						}),
						'_',
						{icon: 'clear_all', name: 'menu.mobile_keyboard.disable_all', condition: () => {
							let {length} = [Pressing.overrides.ctrl, Pressing.overrides.shift, Pressing.overrides.alt].filter(key => key);
							return length;
						}, click() {
							Pressing.overrides.ctrl = false; Pressing.overrides.shift = false; Pressing.overrides.alt = false;
						}},
					])
					menu.open(this.$refs.mobile_keyboard_menu)
				},
				Condition,
				getIconNode: Blockbench.getIconNode
			},
			template: `
				<div id="panel_selector_bar">
					<div class="panel_selector" :class="{selected: selected == null}" @click="select(null)">
						<div class="icon_wrapper"><i class="material-icons icon">3d_rotation</i></div>
					</div>
					<div class="panel_selector" :class="{selected: selected == panel.id}" v-for="panel in panels()" v-if="Condition(panel.condition)" @click="select(panel)">
						<div class="icon_wrapper" v-html="getIconNode(panel.icon).outerHTML"></div>
					</div>
					<div id="mobile_keyboard_menu" @click="openKeyboardMenu($event)" ref="mobile_keyboard_menu" :class="{enabled: modifiers.ctrl || modifiers.shift || modifiers.alt}">
						<i class="material-icons">keyboard</i>
					</div>
				</div>`
		})
	}
}

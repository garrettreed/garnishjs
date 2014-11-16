/**
 * Modal
 */
Garnish.Modal = Garnish.Base.extend({

	$container: null,
	$shade: null,

	visible: false,

	dragger: null,

	desiredWidth: null,
	desiredHeight: null,
	resizeDragger: null,
	resizeStartWidth: null,
	resizeStartHeight: null,

	init: function(container, settings)
	{
		// Param mapping
		if (typeof settings == typeof undefined && $.isPlainObject(container))
		{
			// (settings)
			settings = container;
			container = null;
		}

		this.setSettings(settings, Garnish.Modal.defaults);

		// Create the shade
		this.$shade = $('<div class="'+this.settings.shadeClass+'"/>');

		// If the container is already set, drop the shade below it.
		if (container)
		{
			this.$shade.insertBefore(container);
		}
		else
		{
			this.$shade.appendTo(Garnish.$bod);
		}

		if (container)
		{
			this.setContainer(container);

			if (this.settings.autoShow)
			{
				this.show();
			}
		}

		Garnish.Modal.instances.push(this);
	},

	setContainer: function(container)
	{
		this.$container = $(container);

		// Is this already a modal?
		if (this.$container.data('modal'))
		{
			Garnish.log('Double-instantiating a modal on an element');
			this.$container.data('modal').destroy();
		}

		this.$container.data('modal', this);

		if (this.settings.draggable)
		{
			this.dragger = new Garnish.DragMove(this.$container, {
				handle: (this.settings.dragHandleSelector ? this.$container.find(this.settings.dragHandleSelector) : this.$container)
			});
		}

		if (this.settings.resizable)
		{
			var $resizeDragHandle = $('<div class="resizehandle"/>').appendTo(this.$container);

			this.resizeDragger = new Garnish.BaseDrag($resizeDragHandle, {
				onDragStart:   $.proxy(this, '_handleResizeStart'),
				onDrag:        $.proxy(this, '_handleResize')
			});
		}

		this.addListener(this.$container, 'click', function(ev) {
			ev.stopPropagation();
		});

		// Show it if we're late to the party
		if (this.visible)
		{
			this.show();
		}
	},

	show: function()
	{
		// Close other modals as needed
		if (this.settings.closeOtherModals && Garnish.Modal.visibleModal && Garnish.Modal.visibleModal != this)
		{
			Garnish.Modal.visibleModal.hide();
		}

		if (this.$container)
		{
			// Move it to the end of <body> so it gets the highest sub-z-index
			this.$shade.appendTo(Garnish.$bod);
			this.$container.appendTo(Garnish.$bod);

			this.$container.show();
			this.updateSizeAndPosition();

			this.$shade.velocity('fadeIn', { duration: 50 });
			this.$container.delay(50).velocity('fadeIn', {
				complete: $.proxy(this, 'onFadeIn')
			});

			if (this.settings.hideOnShadeClick)
			{
				this.addListener(this.$shade, 'click', 'hide');
			}

			this.addListener(Garnish.$win, 'resize', 'updateSizeAndPosition');
		}

		if (this.settings.hideOnEsc)
		{
			Garnish.escManager.register(this, 'hide');
		}

		if (!this.visible)
		{
			this.visible = true;
			Garnish.Modal.visibleModal = this;

			this.trigger('show');
			this.settings.onShow();
		}
	},

	quickShow: function()
	{
		this.show();

		if (this.$container)
		{
			this.$container.velocity('stop');
			this.$container.show().css('opacity', 1);

			this.$shade.velocity('stop');
			this.$shade.show().css('opacity', 1);
		}
	},

	hide: function(ev)
	{
		if (ev)
		{
			ev.stopPropagation();
		}

		if (this.$container)
		{
			this.$container.velocity('fadeOut', { duration: Garnish.FX_DURATION });
			this.$shade.velocity('fadeOut', {
				duration: Garnish.FX_DURATION,
				complete: $.proxy(this, 'onFadeOut')
			});

			if (this.settings.hideOnShadeClick)
			{
				this.removeListener(this.$shade, 'click');
			}

			this.removeListener(Garnish.$win, 'resize');
		}

		this.visible = false;
		Garnish.Modal.visibleModal = null;

		if (this.settings.hideOnEsc)
		{
			Garnish.escManager.unregister(this);
		}

		this.trigger('hide');
		this.settings.onHide();
	},

	quickHide: function()
	{
		this.hide();

		if (this.$container)
		{
			this.$container.velocity('stop');
			this.$container.css('opacity', 0).hide();

			this.$shade.velocity('stop');
			this.$shade.css('opacity', 0).hide();
		}
	},

	updateSizeAndPosition: function()
	{
		if (!this.$container)
		{
			return;
		}

		this.$container.css({
			'width':      (this.desiredWidth ? Math.max(this.desiredWidth, 200) : ''),
			'height':     (this.desiredHeight ? Math.max(this.desiredHeight, 200) : ''),
			'min-width':  '',
			'min-height': ''
		});

		// Set the width first so that the height can adjust for the width
		this.updateSizeAndPosition._windowWidth = Garnish.$win.width();
		this.updateSizeAndPosition._width = Math.min(this.getWidth(), this.updateSizeAndPosition._windowWidth - 20);

		this.$container.css({
			'width':      this.updateSizeAndPosition._width,
			'min-width':  this.updateSizeAndPosition._width,
			'left':       Math.round((this.updateSizeAndPosition._windowWidth - this.updateSizeAndPosition._width) / 2)
		});

		// Now set the height
		this.updateSizeAndPosition._windowHeight = Garnish.$win.height();
		this.updateSizeAndPosition._height = Math.min(this.getHeight(), this.updateSizeAndPosition._windowHeight - 20);

		this.$container.css({
			'height':     this.updateSizeAndPosition._height,
			'min-height': this.updateSizeAndPosition._height,
			'top':        Math.round((this.updateSizeAndPosition._windowHeight - this.updateSizeAndPosition._height) / 2)
		});
	},

	onFadeIn: function()
	{
		this.trigger('fadeIn');
		this.settings.onFadeIn();
	},

	onFadeOut: function()
	{
		this.trigger('fadeOut');
		this.settings.onFadeOut();
	},

	getHeight: function()
	{
		if (!this.$container)
		{
			throw 'Attempted to get the height of a modal whose container has not been set.';
		}

		if (!this.visible)
		{
			this.$container.show();
		}

		this.getHeight._height = this.$container.outerHeight();

		if (!this.visible)
		{
			this.$container.hide();
		}

		return this.getHeight._height;
	},

	getWidth: function()
	{
		if (!this.$container)
		{
			throw 'Attempted to get the width of a modal whose container has not been set.';
		}

		if (!this.visible)
		{
			this.$container.show();
		}

		this.getWidth._width = this.$container.outerWidth();

		if (!this.visible)
		{
			this.$container.hide();
		}

		return this.getWidth._width;
	},

	_handleResizeStart: function()
	{
		this.resizeStartWidth = this.getWidth();
		this.resizeStartHeight = this.getHeight();
	},

	_handleResize: function()
	{
		if (Garnish.ltr)
		{
			this.desiredWidth = this.resizeStartWidth + (this.resizeDragger.mouseDistX * 2);
		}
		else
		{
			this.desiredWidth = this.resizeStartWidth - (this.resizeDragger.mouseDistX * 2);
		}

		this.desiredHeight = this.resizeStartHeight + (this.resizeDragger.mouseDistY * 2);

		this.updateSizeAndPosition();
	},

	/**
	 * Destroy
	 */
	destroy: function()
	{
		if (this.$container)
		{
			this.$container.removeData('modal');
		}

		if (this.dragger)
		{
			this.dragger.destroy();
		}

		if (this.resizeDragger)
		{
			this.resizeDragger.destroy();
		}

		this.base();
	}
},
{
	relativeElemPadding: 8,
	defaults: {
		autoShow: true,
		draggable: false,
		dragHandleSelector: null,
		resizable: false,
		onShow: $.noop,
		onHide: $.noop,
		onFadeIn: $.noop,
		onFadeOut: $.noop,
		closeOtherModals: true,
		hideOnEsc: true,
		hideOnShadeClick: true,
		shadeClass: 'modal-shade'
	},
	instances: [],
	visibleModal: null
});

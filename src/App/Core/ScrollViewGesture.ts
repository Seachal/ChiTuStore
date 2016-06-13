import chitu = require('chitu');

/** 通用手势切换 ScrollView */
class ScrollViewGesture {
    private active_item: chitu.ScrollView;
    private next_item: chitu.ScrollView;
    private prev_item: chitu.ScrollView;
    private above_item: chitu.ScrollView;
    private below_item: chitu.ScrollView;
    private scroll_args: chitu.ScrollArguments;

    private active_item_pos_x: number = 0;
    private active_item_pos_y: number = 0;
    private next_item_pos: number;
    private prev_item_pos: number;

    private container_width: number;
    private container_height: number;
    private moveType: 'none' | 'horizontal' | 'vertical' = 'none';
    private _offset: { up: number, down: number, left: number, right: number };

    on_release: (deltaX: number, deltaY: number) => boolean;

    constructor(scroll_view: chitu.ScrollView) {
        if (scroll_view == null) throw chitu.Errors.argumentNull('scroll_view');

        let page_container = scroll_view.page.container;
        $(page_container.element).data('ScrollViewGesture', this);

        this.container_width = $(page_container.element).width();
        this.container_height = $(page_container.element).height();


        this.set_activeItem(scroll_view);

        var pan = page_container.gesture.createPan();
        pan.start = $.proxy(this.on_panStart, this);
        pan.left = $.proxy(this.on_panLeft, this);
        pan.right = $.proxy(this.on_panRight, this);
        pan.end = $.proxy(this.on_panEnd, this);

        this._offset = {
            up: -100,
            down: 100,
            left: 0 - this.container_width/2,
            right: this.container_width/2
        }

        this.on_release = (deltaX: number, deltaY: number) => {
            if (deltaX != 0 && Math.abs(deltaX) / this.container_width >= 0.5) {
                return true;
            }
            else if (deltaY != 0 && deltaY < this.offset.up) {
                return true;
            }
            else if (deltaY != 0 && deltaY > this.offset.down) {
                return true;
            }

            return false;
        };
    }

    get offset(): { up: number, down: number, left: number, right: number } {
        return this._offset;
    }

    private on_panStart(e: Hammer.PanEvent) {
        let $active_item = $(this.active_item.element);
        // if (chitu.ScrollView.scrolling) {
        //     return false;
        // }

        //==================================================
        // 说明：计算角度，超过了水平滑动角度，则认为不是水平滑动。
        let d = Math.atan(Math.abs(e.deltaY / e.deltaX)) / 3.14159265 * 180;
        if (d > 20 && d < 70)
            return false;
        //==================================================

        if ((e.direction & Hammer.DIRECTION_LEFT) == Hammer.DIRECTION_LEFT || (e.direction & Hammer.DIRECTION_RIGHT) == Hammer.DIRECTION_RIGHT)
            this.moveType = "horizontal";
        else if ((e.direction & Hammer.DIRECTION_UP) == Hammer.DIRECTION_UP || (e.direction & Hammer.DIRECTION_DOWN) == Hammer.DIRECTION_DOWN)
            this.moveType = "vertical";

        let started: boolean = (this.next_item != null && (e.direction & Hammer.DIRECTION_LEFT) == Hammer.DIRECTION_LEFT) ||
            (this.prev_item != null && (e.direction & Hammer.DIRECTION_RIGHT) == Hammer.DIRECTION_RIGHT) ||
            (this.below_item != null && (e.direction & Hammer.DIRECTION_UP) == Hammer.DIRECTION_UP) ||
            (this.above_item != null && (e.direction & Hammer.DIRECTION_DOWN) == Hammer.DIRECTION_DOWN);

        return started;
    }

    private on_panLeft(e: Hammer.PanEvent) {
        if (this.moveType != "horizontal")
            return;

        move(this.active_item.element).x(this.active_item_pos_x + e.deltaX).duration(0).end();
        if (this.next_item != null)
            move(this.next_item.element).x(this.next_item_pos + e.deltaX).duration(0).end();

        if (this.prev_item != null)
            move(this.prev_item.element).x(this.prev_item_pos + e.deltaX).duration(0).end();
    }

    private on_panRight(e: Hammer.PanEvent) {
        if (this.moveType != "horizontal")
            return;

        move(this.active_item.element).x(this.active_item_pos_x + e.deltaX).duration(0).end();
        if (this.next_item != null)
            move(this.next_item.element).x(this.next_item_pos + e.deltaX).duration(0).end();

        if (this.prev_item != null)
            move(this.prev_item.element).x(this.prev_item_pos + e.deltaX).duration(0).end();
    }

    private on_panEnd(e: Hammer.PanEvent) {
        if (this.moveType == "horizontal") {
            this.processHorizontalMove(e.deltaX);
        }
        else if (this.moveType == "vertical" && this.scroll_args != null) {
            let deltaY = this.scroll_args.clientHeight - (this.scroll_args.scrollTop + this.scroll_args.scrollHeight);
            this.processVerticalMove(deltaY);
        }
    }

    private processVerticalMove(deltaY: number) {
        let cancel = this.on_release(0, deltaY) == false;
        if (cancel) {
            move(this.active_item.element).y(this.active_item_pos_y);

            return;
        }

        if (deltaY > 0 && this.below_item != null) {
            move(this.active_item.element).y(0 - this.container_height).end();
            move(this.below_item.element).y(0).end();
            this.set_activeItem(this.below_item);
        }
        else if (deltaY < 0 && this.above_item != null) {
            move(this.active_item.element).y(this.container_height).end();
            move(this.above_item.element).y(0).end();
            this.set_activeItem(this.above_item);
        }
    }

    private processHorizontalMove(deltaX: number) {
        let cancel = this.on_release(deltaX, 0) == false;
        if (cancel) {
            move(this.active_item.element).x(this.active_item_pos_x).end();
            if (this.next_item != null)
                move(this.next_item.element).x(this.next_item_pos).end();
            if (this.prev_item != null)
                move(this.prev_item.element).x(this.prev_item_pos).end();

            return;
        }

        if (deltaX < 0 && this.next_item != null) { // 向左移动
            move(this.active_item.element).x(this.prev_item_pos).end();
            move(this.next_item.element).x(this.active_item_pos_x).end();
            //this.active_item = this.next_item;
            this.set_activeItem(this.next_item);
        }
        else if (deltaX > 0 && this.prev_item != null) { // 向右移动
            move(this.active_item.element).x(this.next_item_pos).end();
            move(this.prev_item.element).x(this.active_item_pos_x).end();
            this.set_activeItem(this.prev_item);
        }
    }

    private on_scroll(sender: chitu.ScrollView, args: chitu.ScrollArguments) {
        //console.log(sender.name + ' scrollTop:' + args.scrollTop);
        var self = <ScrollViewGesture><any>$(sender.page.container.element).data('ScrollViewGesture');
        self.scroll_args = args;
    }

    private set_activeItem(active_item: chitu.ScrollView) {
        //new GesturePull(active_item);
        if (active_item == null) throw chitu.Errors.argumentNull('active_item');

        if (this.active_item != null) {
            this.active_item.scroll.remove(this.on_scroll);
        }
        this.active_item = active_item;
        this.active_item.scroll.add(this.on_scroll);

        var pos = $(this.active_item.element).position();
        this.next_item_pos = this.container_width;
        this.prev_item_pos = 0 - this.next_item_pos;

        let $active_item = $(active_item.element);
        let next_name = $active_item.attr('next');
        let prev_name = $active_item.attr('prev');
        let above_name = $active_item.attr('above');
        let below_name = $active_item.attr('below');
        let page = active_item.page;
        if (next_name) {
            this.next_item = page.findControl<chitu.ScrollView>(next_name);
            if (this.next_item == null)
                throw Errors.controlNotExists(next_name);
        }
        else {
            this.next_item = null;
        }

        if (prev_name) {
            this.prev_item = page.findControl<chitu.ScrollView>(prev_name);
            if (this.prev_item == null)
                throw Errors.controlNotExists(prev_name);
        }
        else {
            this.prev_item = null;
        }

        if (above_name) {
            this.above_item = page.findControl<chitu.ScrollView>(above_name);
            if (this.above_item == null)
                throw Errors.controlNotExists(above_name);
        }
        else {
            this.above_item = null;
        }

        if (below_name) {
            this.below_item = page.findControl<chitu.ScrollView>(below_name);
            if (this.below_item == null)
                throw Errors.controlNotExists(below_name);
        }
        else {
            this.below_item = null;
        }
    }
}

class Errors {
    static controlNotExists(name) {
        let msg = chitu.Utility.format('Control named "{0}" is not exists.', name);
        return new Error(msg);
    }
}

export = ScrollViewGesture;
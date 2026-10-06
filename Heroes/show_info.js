var subdir = '40';
var subdir_unit = '40';
var textdebug = false;
var shadow_height = 0.35;
var shadow_alpha = 0.4;
var shadowblur = 0;
var cur_file = '';
var old_cur_file = '';
var doing_rate = 0.05;
var magic = Array();
var si_container = '0';
var is_ohota = false;
var anim_effects_ver = 1;

function show_army_getMyPixelRatio(stage_width){
//	var base = 300;
//	var ratio = Math.min(2, base/stage_width);
	ratio = 2;
	return ratio;
};


function check_initialized(){
	return true;
};

// Standalone Konva preview. Effect resources and playback use the shared battle API.
function show_info_effects_current(unit) {
    var owner = unit && unit.hwm_show_info_owner;
    return !!(owner && typeof stage !== 'undefined' && stage[unit.container] === owner &&
        owner.obj && owner.obj[unit.filename] === unit);
}

function show_info_effects_error(unit, error) {
    if (typeof console !== 'undefined' && console.warn) console.warn('Creature preview effect failed: ' + unit.anim_effects_filename, error);
}

function show_info_effects_detach(unit) {
    if (!unit) return;
    unit.hwm_show_info_effects_generation = (unit.hwm_show_info_effects_generation || 0) + 1;
    unit.hwm_show_info_effects_loading = false;
    unit.hwm_show_info_effects_syncing = false;
    if (typeof HWMBattleAnimEffects !== 'undefined') HWMBattleAnimEffects.detachUnit(unit);
}

function show_info_effects_hide(unit, draw) {
    if (!unit) return;
    if (unit.layer) unit.layer.visible(0);
    if (unit.arrow_layer) unit.arrow_layer.visible(0);
    if (unit.uron_layer) unit.uron_layer.visible(0);
    if (draw && show_info_effects_current(unit)) unit.hwm_show_info_owner.unit_layer.draw();
}

function show_info_effects_fail(unit, error) {
    show_info_effects_hide(unit, false);
    show_info_effects_detach(unit);
    unit.hwm_show_info_effects_failed = true;
    unit.hwm_show_info_display_pending = true;
    show_info_effects_hide(unit, true);
    show_info_effects_error(unit, error);
}

function show_info_effects_enabled(unit) {
    if (!unit) return false;
    if (typeof HWMBattleAnimEffects !== 'undefined' && typeof HWMBattleAnimEffects.hasUnitEffects === 'function') {
        return HWMBattleAnimEffects.hasUnitEffects(unit);
    }
    var key = unit.hwm_animation_load && unit.hwm_animation_load.target_key || unit.filename;
    var metadata = unit.razmetka;
    if (!unit.inited_image && typeof razmetka !== 'undefined') metadata = razmetka[key];
    return !!unit.effects || !!(metadata && Object.prototype.hasOwnProperty.call(metadata, 'animEffects'));
}

function show_info_effects_ready(unit) {
    if (!unit) return false;
    if (!show_info_effects_enabled(unit)) return true;
    if (unit.hwm_show_info_effects_loading || unit.hwm_show_info_effects_syncing ||
        unit.hwm_show_info_effects_failed || typeof HWMBattleAnimEffects === 'undefined' ||
        !HWMBattleAnimEffects.isUnitPrepared(unit, unit.hwm_show_info_effects_options)) return false;
    var controller = unit.hwm_anim_effects_controller;
    if (!controller || controller.destroyed) return false;
    for (var i = 0; i < controller.items.length; i++) {
        var item = controller.items[i];
        if (item.binding.enabled && (!item.sprite || item.sprite.destroyed || item.sprite._destroyed)) return false;
    }
    return true;
}

function show_info_effects_reveal(unit, draw) {
    if (!show_info_effects_current(unit) || unit.hwm_show_info_owner.filename !== unit.filename ||
        !unit.inited_image || unit.hwm_show_info_summon_wait || !show_info_effects_ready(unit)) return false;
    if (!unit.hwm_show_info_display_pending) return true;
    // Warm the body cache and place every effect before drawing the first visible frame.
    unit.layer.clearCache();
    unit.layer.visible(1);
    if (unit.arrow_layer) unit.arrow_layer.visible(1);
    if (unit.uron_layer) unit.uron_layer.visible(1);
    unit.need_refresh = 1;
    unit.show_obj();
    if (unit.hwm_anim_effects_controller) {
        unit.hwm_anim_effects_controller.restart();
        show_info_effects_tick(unit, Date.now());
        if (unit.hwm_show_info_effects_failed) return false;
    }
    unit.hwm_show_info_display_pending = false;
    if (draw !== false) unit.hwm_show_info_owner.unit_layer.draw();
    return true;
}

function show_info_effects_sync(unit) {
    if (!show_info_effects_current(unit) || unit.hwm_show_info_owner.filename !== unit.filename ||
        !unit.inited_image) return;
    if (!show_info_effects_enabled(unit) || unit.hwm_anim_effects_controller) {
        show_info_effects_reveal(unit);
        return;
    }
    if (unit.hwm_show_info_effects_loading || unit.hwm_show_info_effects_failed ||
        unit.hwm_show_info_effects_syncing) return;
    var generation = unit.hwm_show_info_effects_generation;
    unit.hwm_show_info_effects_syncing = true;
    HWMBattleAnimEffects.syncUnit(unit, unit.hwm_show_info_effects_options).then(function (controller) {
        if (!show_info_effects_current(unit) || generation !== unit.hwm_show_info_effects_generation) return;
        unit.hwm_show_info_effects_syncing = false;
        if (!controller || !show_info_effects_ready(unit)) {
            show_info_effects_fail(unit, new Error('Creature preview effects are not ready.'));
            return;
        }
        show_info_effects_reveal(unit);
    }, function (error) {
        if (!show_info_effects_current(unit) || generation !== unit.hwm_show_info_effects_generation) return;
        show_info_effects_fail(unit, error);
    });
}

function show_info_effects_setup(unit, filename, version, subpath) {
    show_info_effects_hide(unit, false);
    show_info_effects_detach(unit);
    unit.hwm_show_info_display_pending = true;
    var key = filename.replace(/^mega#/, '');
    // Previews use embedded metadata, without the legacy PHP effect flag.
    unit.effects = 0;
    unit.anim_effects_filename = key;
    unit.hwm_show_info_owner = stage[unit.container];
    unit.hwm_show_info_effects_failed = false;
    // Use the same effect URLs as battle, independently of the creature image CDN.
    unit.hwm_show_info_effects_options = {
        version: version,
        draw: false,
        onError: function (error) { show_info_effects_fail(unit, error); }
    };
    if (unit.inited_image) show_info_effects_prepare_unit(unit);
}

function show_info_effects_prepare_unit(unit) {
    if (!show_info_effects_current(unit)) return false;
    if (!show_info_effects_enabled(unit)) return true;
    if (unit.hwm_show_info_effects_failed) return false;
    if (typeof HWMBattleAnimEffects === 'undefined') {
        show_info_effects_fail(unit, 'anim_effects.js is unavailable');
        return false;
    }
    if (HWMBattleAnimEffects.isUnitPrepared(unit, unit.hwm_show_info_effects_options)) return true;
    if (unit.hwm_show_info_effects_loading) return false;
    var generation = unit.hwm_show_info_effects_generation;
    unit.hwm_show_info_effects_loading = true;
    HWMBattleAnimEffects.prepareUnit(unit, unit.hwm_show_info_effects_options).then(function () {
        if (!show_info_effects_current(unit) || generation !== unit.hwm_show_info_effects_generation) return;
        unit.hwm_show_info_effects_loading = false;
        if (!HWMBattleAnimEffects.isUnitPrepared(unit, unit.hwm_show_info_effects_options)) {
            show_info_effects_fail(unit, new Error('Creature preview effect resources are not ready.'));
            return;
        }
        if (!unit.inited_image && typeof unit.init_this_obj === 'function') unit.init_this_obj();
        show_info_effects_sync(unit);
    }, function (error) {
        if (!show_info_effects_current(unit) || generation !== unit.hwm_show_info_effects_generation) return;
        show_info_effects_fail(unit, error);
    });
    return false;
}

function show_info_effects_tick(unit, now) {
    var controller = unit && unit.hwm_anim_effects_controller;
    if (!controller || controller.destroyed || unit.hwm_show_info_summon_wait || !unit.layer.isVisible()) return false;
    try {
        controller.tick(now);
    } catch (error) {
        show_info_effects_fail(unit, error);
        return false;
    }
    return true;
}

function show_info_effects_canvas_layout(owner) {
    owner.content.style.position = 'relative';
    owner.content.style.zIndex = '1';
    var canvas = owner.unit_layer.getCanvas()._canvas;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.padding = '0';
    canvas.style.margin = '0';
    canvas.style.border = '0';
    canvas.style.background = 'transparent';
}

function destroy_army_info(cont) {
    var owner = typeof stage !== 'undefined' ? stage[cont] : null;
    if (!owner) return;
    clearInterval(owner.interval);
    for (var key in owner.obj) {
        if (Object.prototype.hasOwnProperty.call(owner.obj, key)) show_info_effects_detach(owner.obj[key]);
    }
    if (owner.hwm_show_info_background && owner.hwm_show_info_background.parentNode) {
        owner.hwm_show_info_background.parentNode.removeChild(owner.hwm_show_info_background);
    }
    owner.destroy();
    delete stage[cont];
}

function init_army_info(cont, filename, obj_ver, fon, fon_ver, subpath, stage_width, stage_height, quality, magic, summon, ohota, big){
	var container = document.getElementById(cont);
	if (!container) return 0;
	if (typeof magic === 'undefined') magic = Array();
	if (typeof summon === 'undefined') summon = 0;
	destroy_army_info(cont);
	si_container = cont;
	old_cur_file = '';
	summon_init = false;
	group_link = Array();
	img_link = Array();
	current_frame = 0;
	mega = false;

	if (stage_width=='auto'){
		stage_width = Math.floor(container.offsetWidth);
	};
	if (stage_height=='auto'){
		stage_height = Math.floor(container.offsetHeight);
	};
	
	Konva.pixelRatio = show_army_getMyPixelRatio(stage_width)/*quality*/;


	if (typeof stage === 'undefined') stage = {};
		  stage[cont] = new Konva.Stage({
		  container: cont,
		  width: stage_width,
		  height: stage_height,
		  hitGraphEnabled: false,
		  listening: false
	});
	stage[cont].init_stage_army_info = init_stage_army_info;
	stage[cont].check_initialized = check_initialized;
    stage[cont].init_stage_army_info(cont, filename, obj_ver, fon, fon_ver, subpath, stage_width, stage_height, magic, summon, ohota, big);

};

var summon_call_back = function(){};

function reload_army_info(cont, filename, obj_ver, subpath, magic, summon, call_back_func){
    var owner = stage[cont];
    if (!owner) return 0;
    if (typeof magic === 'undefined') magic = Array();
    si_container = cont;
    cur_file = owner.filename;
    if (filename === cur_file && !summon) return 0;
    if (summon) summon_call_back = typeof call_back_func === 'function' ? call_back_func : function () {};
    current_frame = 0;
    if (old_cur_file && owner.obj[old_cur_file] && old_cur_file !== cur_file) {
        show_info_effects_hide(owner.obj[old_cur_file], false);
        show_info_effects_detach(owner.obj[old_cur_file]);
    }
    old_cur_file = cur_file;
    if (cur_file && owner.obj[cur_file]) {
        var previous = owner.obj[cur_file];
        previous.layer.clearCache();
        previous.layer.opacity(1);
        if (!summon) {
            show_info_effects_hide(previous, false);
            show_info_effects_detach(previous);
        }
        previous.doing = '';
        previous.frame = 0;
    }
    cur_file = filename;
    owner.filename = filename;
    var unit = owner.obj[filename];
    if (!unit) {
        unit = owner.obj[filename] = {};
        unit.filename = filename;
        unit.stage_width = owner.stage_width;
        unit.stage_height = owner.stage_height;
        unit.add_obj = add_obj;
        unit.setshoot = setshoot;
        unit.scaling = Math.min(owner.stage_height, owner.stage_width) / show_info_height;
        unit.container = cont;
        unit.magic = magic;
        unit.hwm_show_info_summon_wait = !!summon;
        show_info_effects_setup(unit, filename, obj_ver, subpath);
        unit.add_obj('unit', filename, obj_ver, subpath, true, obj_inited_show, true);
    } else {
        unit.layer.clearCache();
        unit.layer.opacity(1);
        unit.hwm_show_info_summon_wait = !!summon;
        show_info_effects_setup(unit, filename, obj_ver, subpath);
        if (unit.inited_image) {
            unit.doing = '';
            unit.frame = 0;
            unit.statix_to_dynamic();
            unit.set_statix(unit.dynamic);
            unit.set_data();
            unit.need_refresh = 1;
            show_info_effects_sync(unit);
        }
    }
    owner.unit_layer.draw();
}

var mega = false;
var is_summon = false;

var image_array = Array('flare_1', 'glow_1', 'magic_1');
var anim_array_layers = Array('flare_1', 'flare_1', 'magic_1', 'glow_1');
var anim_commands = Array();
var group_link = Array();
var img_link = Array();
anim_commands[0] = Array({frame: 1, scale: 0, rotation: 0, visible: 0}, {frame: 10, scale: 0, rotation:0, visible: 1}, {frame: 35, rotation: 0, scale: 95, visible: 1}, {frame: 55, rotation: 0, scale: 90, visible: 1}, {frame: 60, rotation: 0, scale: 0, visible: 0});
anim_commands[1] = Array({frame: 1, scale: 0, rotation: 0, visible: 0}, {frame: 27, scale: 0, rotation:0, visible: 1}, {frame: 42, rotation: 45, scale: 100, visible: 1}, {frame: 57, rotation: 90, scale: 0, visible: 0});
anim_commands[2] = Array({frame: 1, scale: 0, rotation: 0, visible: 1}, {frame: 55, scale: 100, rotation:165, visible: 1}, {frame: 60, rotation: 180, scale: 0, visible: 0});
anim_commands[3] = Array({frame: 1, scale: 0, rotation: 0, visible: 1}, {frame: 10, scale: 100, rotation:20, visible: 1}, {frame: 50, rotation: 100, scale: 100, visible: 1}, {frame: 60, rotation: 120, scale: 0, visible: 0});
var summon_init = false;
var summon_width = 300;
var current_frame = 0;
var show_obj_frame = 45;

function animate_summon(){
	var visible = 0;
	var scale = 0;
	var frame_cnt = 0;
	var frame_cur = 0;
	var im_width = 500;
	var was_changes = false;
	if ((cur_file!='')&&(show_info_effects_ready(stage[si_container].obj[cur_file]))&&(current_frame<200)&&(summon_init)&&(is_summon)&&(stage[si_container].obj[cur_file].inited)/*&&(stage[si_container].obj[2].inited)*/){
		current_frame++;
		for (var i=0;i<anim_commands.length;i++)
		{
			for (j=0;j<anim_commands[i].length-1;j++)
			{
				k = j + 1;
				if ((anim_commands[i][j].frame<=current_frame)&&(anim_commands[i][k].frame>=current_frame)){
					frame_cnt = anim_commands[i][k].frame - anim_commands[i][j].frame;
					frame_cur = current_frame - anim_commands[i][j].frame;
					scale = anim_commands[i][j].scale + (anim_commands[i][k].scale - anim_commands[i][j].scale)*frame_cur/frame_cnt;
					rotation = anim_commands[i][j].rotation + (anim_commands[i][k].rotation - anim_commands[i][j].rotation)*frame_cur/frame_cnt;
					if (anim_commands[i][j].frame==current_frame) {
						group_link[i].visible(anim_commands[i][j].visible);
					};
					if (anim_commands[i][k].frame==current_frame) {
						group_link[i].visible(anim_commands[i][k].visible);
					};
					scale = scale/100;
					img_link[i].scaleX(scale);
					img_link[i].scaleY(scale);
					group_link[i].rotation(rotation);

					was_changes = true;
					break;
				};
			}
		};
		if (current_frame<show_obj_frame - 20){
			
			if (old_cur_file!='') {
				stage[si_container].obj[old_cur_file].layer.no_filter = true;
				if (!show_info_effects_enabled(stage[si_container].obj[old_cur_file])) stage[si_container].obj[old_cur_file].layer.cache();
				else stage[si_container].obj[old_cur_file].layer.clearCache();
				stage[si_container].obj[old_cur_file].layer.opacity(1-current_frame/(show_obj_frame - 20));
			};
		};
		if (current_frame == show_obj_frame){
			if (old_cur_file!='') {
				show_info_effects_hide(stage[si_container].obj[old_cur_file], false);
				if (old_cur_file !== cur_file) show_info_effects_detach(stage[si_container].obj[old_cur_file]);
			};
			stage[si_container].obj[cur_file].hwm_show_info_summon_wait = false;
			if (!show_info_effects_reveal(stage[si_container].obj[cur_file], false)) return;
			summon_call_back();
		};
		var mopacity = (current_frame - show_obj_frame)/(60 - show_obj_frame);
		if ((current_frame >= show_obj_frame)&&(mopacity<=1)){
			stage[si_container].obj[cur_file].layer.no_filter = true;
			if (mopacity<1 && !show_info_effects_enabled(stage[si_container].obj[cur_file])) stage[si_container].obj[cur_file].layer.cache(); else stage[si_container].obj[cur_file].layer.clearCache();
			stage[si_container].obj[cur_file].layer.opacity(Math.min(1, mopacity));
		};
		if (was_changes) {
			stage[si_container].unit_layer.draw();
		};
	};
};

function check_init(){
	if (!is_summon || typeof stage === 'undefined' || !stage[si_container] || !stage[si_container].effect) return;
	var c = 0;
		for (var i = 0; i<image_array.length;i++)
		{
			if ((image_obj[image_array[i]])&&(image_obj[image_array[i]].loaded)) c++;
		};
		if ((c==image_array.length)&&(!summon_init)){
			for (var i = anim_array_layers.length-1; i>=0;i--)
			{
			  var img_temp = new Konva.Image({x: 0, y: 0, offsetX: 250, offsetY: 250, hitGraphEnabled: false, image: image_obj[anim_array_layers[i]], visible: 1, listening: false});
			  var group = new Konva.Group({hitGraphEnabled : false, listening: false, visible: 0});
			  group_link[i] = group;
			  group_link[i].x(summon_width/2);
 			  group_link[i].y(summon_width/10*8);
			  img_link[i] = img_temp;
			  group.scaleX(1);
			  group.scaleY(1);
			  group.add(img_temp);
			  stage[si_container].effect.add(group);
			};

			if (cur_file!='') stage[si_container].obj[cur_file].layer.setZIndex(1);
			stage[si_container].effect.setZIndex(2);
			summon_init = true;
		};
};

var test_objs = 0;
var fps_c = 0;
var fps_time = 0;
var was_do = 0;
var show_info_width = 300;
var show_info_height = 300;



function add_fon_images(){
	if (this.inited) return 0;
	if ((!this.fon1)||(!this.fon2)||(!this.fon3)||(this.fon1.width==0)||(this.fon2.width==0)||(this.fon3.width==0)) return 0;
	var stage_width = this.stage_width;
	var stage_height = this.stage_height;
	var original_width = show_info_width;
	var original_height = show_info_height;
	var max_side = Math.max(stage_width, stage_height); 
	var min_side = Math.min(stage_width, stage_height); 
	var fon_img1 = new Konva.Image({x: stage_width-max_side, y: stage_height-max_side, image: this.fon1, width: max_side, 
		height: max_side, listening: false});/**/
	fon_img1.visible(1);
	this.fon_img1 = fon_img1;
	this.add(fon_img1);

	var fon_walk1_width = 500;
	this.fon_walk1 = Array();
	for (var i=0;i<=Math.floor(stage_width/fon_walk1_width)+1;i++)
	{
		var fon_img2 = new Konva.Image({x: i*fon_walk1_width, y: 0, image: this.fon2, width: fon_walk1_width, 
			height: stage_height, crop:{x: 0, y: 0, 
			width: fon_walk1_width*2, height: 600, visible: 0, perfectDrawEnabled: false}, listening: false});/**/
		fon_img2.visible(1);
		this.fon_img2 = fon_img2;
		this.add(fon_img2);
		this.fon_walk1[i] = fon_img2;
	}


	var fon_walk2_width = 300;
	this.fon_walk2 = Array();
	for (var i=0;i<=Math.floor(stage_width/fon_walk2_width)+1;i++)
	{
		var fon_img3 = new Konva.Image({x: i*fon_walk2_width, y: 240*stage_height/original_height, image: this.fon3, width: 300, 
			height: 60, crop:{x: 0, y: 0, 
			width: 600, height: 120, visible: 0, perfectDrawEnabled: false}, listening: false});/**/
		fon_img3.visible(1);
		this.fon_img3 = fon_img3;
		this.add(fon_img3);
		this.fon_walk2[i] = fon_img3;
	};
	this.inited = true;
};


function walk_fon_images(dx){
	if (!this.inited) this.check_css_init();
	if (!this.inited) return 0;
	var stage_width = this.stage_width;
	var stage_height = this.stage_height;
	var original_width = show_info_width;
	var original_height = show_info_height;
/*	var max_side = Math.max(stage_width, stage_height); 
	var min_side = Math.min(stage_width, stage_height); */
	var fon_walk1_width = 500;
	for (var i=0;i<=Math.floor(stage_width/fon_walk1_width)+1;i++)
	{
		var xx = this.fon_walk1[i].xx+dx/2;
		if (xx >= fon_walk1_width*i) xx -= fon_walk1_width;
		this.fon_walk1[i].xx = xx;
		this.fon_walk1[i].style.left = this.fon_walk1[i].xx+'px';

	}


	var fon_walk2_width = 300;
	for (var i=0;i<=Math.floor(stage_width/fon_walk2_width)+1;i++)
	{
		var xx = this.fon_walk2[i].xx + dx;
		if (xx >= fon_walk2_width*i) xx -= fon_walk2_width;
		this.fon_walk2[i].xx = xx;
		this.fon_walk2[i].style.left = this.fon_walk2[i].xx+'px';

	};


};

function check_css_init(){
	if (this.fon1.complete && this.fon1.naturalHeight !== 0 && this.fon_walk1[0].complete && this.fon_walk1[0].naturalHeight !== 0 && this.fon_walk2[0].complete && this.fon_walk2[0].naturalHeight !== 0) {
		this.fon1.style.display = 'block';
		this.fon_walk1[0].style.display = 'block';
		this.fon_walk2[0].style.display = 'block';
		this.inited = true;
	};
};

function init_stage_army_info(cont, filename, obj_ver, fon, fon_ver, subpath, stage_width, stage_height, magic, summon, ohota, big){
	if (typeof magic === 'undefined') magic = Array();
	if (typeof summon === 'undefined') summon = 0;
	is_ohota = ohota;
	is_summon = summon;
	this.is_summon = summon;
	this.is_ohota = ohota;
	var original_width = show_info_width;
	var original_height = show_info_height;
	var timer_interval=40;
	summon_width = 300;





	
	if (stage_height<original_height) {/*subdir_unit = '30';*/doing_rate = 0.01;};
	if (ohota) doing_rate = 0.002;
	

	layer = new Konva.Layer({hitGraphEnabled : false, listening: false});
	this.unit_layer = layer;
	this.stage_height = stage_height;
	this.stage_width = stage_width;

	var effect_layer = new Konva.Group({hitGraphEnabled : false, listening: false});
	this.unit_layer.add(effect_layer);
/*	var fon_layer = new Konva.Group({hitGraphEnabled : false, listening: false});
	this.unit_layer.add(fon_layer);
	this.unit_layer.fon_layer = fon_layer;

	this.unit_layer.fon_layer.filename = filename;
	this.unit_layer.fon_layer.container = cont;
	this.unit_layer.fon_layer.loaded_count = 0;
	this.unit_layer.fon_layer.add_fon_images = add_fon_images;
	this.unit_layer.fon_layer.walk_fon_images = walk_fon_images;


	this.unit_layer.fon_layer.init_this_obj = function(){
		this.add_fon_images();
	};
	this.unit_layer.fon_layer.stage_width = stage_width;
	this.unit_layer.fon_layer.stage_height = stage_height;
	this.unit_layer.fon_layer.add_image = add_image;
	this.unit_layer.fon_layer.add_image("fon3", 'g'+fon, "png", fon_ver, subpath);
	this.unit_layer.fon_layer.add_image("fon2", 'b'+fon, "png", fon_ver, subpath);
	this.unit_layer.fon_layer.add_image("fon1", 'f'+fon, "jpg", fon_ver, subpath);
	this.unit_layer.fon_layer.setZIndex(0);*/

   this.unit_layer.inited = false;
   this.unit_layer.stage_width = stage_width;
   this.unit_layer.stage_height = stage_height;
   this.unit_layer.walk_fon_images = walk_fon_images;
   this.unit_layer.check_css_init = check_css_init;
   var fon_div = document.getElementById(cont);


   fon_div.style.overflow = 'hidden';
   fon_div.style.width = stage_width+'px';
   fon_div.style.height = stage_height+'px';
   fon_div.style.position = 'relative';
   var div = document.createElement("div");
//   fon_div.appendChild(div);
   fon_div.insertBefore(div, fon_div.childNodes[0]);
   this.hwm_show_info_background = div;

   var img = document.createElement("img");
   img.src = subpath+"png40/"+'f'+fon+'.jpg?ver='+fon_ver;
   img.style.width = '100%';
   img.style.height = '100%';
   img.style.position = 'absolute';
   img.style.top = 0;
   img.style.left = 0;
   img.style.display = 'none';

   div.appendChild(img);
   this.unit_layer.fon1 = img;


	var fon_walk1_width = 500;
	this.unit_layer.fon_walk1 = Array();
	for (var i=0;i<=Math.floor(stage_width/fon_walk1_width)+1;i++)
	{
/*		var fon_img2 = new Konva.Image({x: i*fon_walk1_width, y: 0, image: this.fon2, width: fon_walk1_width, 
			height: stage_height, crop:{x: 0, y: 0, 
			width: fon_walk1_width*2, height: 600, visible: 0, perfectDrawEnabled: false}, listening: false});
		fon_img2.visible(1);
		this.fon_img2 = fon_img2;
		this.add(fon_img2);
		this.fon_walk1[i] = fon_img2;*/
	   var img = document.createElement("img");
	   this.unit_layer.fon_walk1[i] = img;
	   this.unit_layer.fon_walk1[i].xx = i*fon_walk1_width;
	   img.src = subpath+"png40/"+'b'+fon+'.png?ver='+fon_ver;
	   img.style.width = (fon_walk1_width)+'px';
	   img.style.height = '100%';
	   img.style.position = 'absolute';
	   img.style.top = 0;
	   img.style.left = this.unit_layer.fon_walk1[i].xx+'px';
	   if (i==0) img.style.display = 'none';
	   div.appendChild(img);
	}


	var fon_walk2_width = 300;
	this.unit_layer.fon_walk2 = Array();
	for (var i=0;i<=Math.floor(stage_width/fon_walk2_width)+1;i++)
	{
		var fon_img3 = new Konva.Image({x: i*fon_walk2_width, y: 240*stage_height/original_height, image: this.fon3, width: 300,
			height: 60, crop:{x: 0, y: 0,
			width: 600, height: 120, visible: 0, perfectDrawEnabled: false}, listening: false});

	   var img = document.createElement("img");
	   this.unit_layer.fon_walk2[i] = img;
	   this.unit_layer.fon_walk2[i].xx = i*fon_walk2_width;
	   img.src = subpath+"png40/"+'g'+fon+'.png?ver='+fon_ver;
	   img.style.width = (fon_walk2_width)+'px';
	   img.style.height = '20%';
	   img.style.position = 'absolute';
	   img.style.top = '80%';
	   img.style.left = this.unit_layer.fon_walk2[i].xx + 'px';
	   if (i==0) img.style.display = 'none';

	   div.appendChild(img);
	};
    this.unit_layer.check_css_init();

	this.effect = effect_layer;
	this.effect.setZIndex(2);

//	this.unit_layer.scaleX(this.width()/original_width);
//	this.unit_layer.scaleY(this.width()/original_width);
	this.add(layer);
	show_info_effects_canvas_layout(this);
	if (filename.substr(0, 5)=='mega#'){
		mega = true;
		filename = filename.substr(5);
	};
	cur_file = filename;
	this.obj = {};
	this.obj[filename] = this.obj[cur_file];
	this.filename = filename;
	if (cur_file!=''){
		this.obj[cur_file] = {};
		this.obj[cur_file].filename = filename;
		this.obj[cur_file].big = big;
		this.obj[cur_file].stage_width = stage_width;
		this.obj[cur_file].stage_height = stage_height;
		this.obj[cur_file].add_obj = add_obj;
		this.obj[cur_file].setshoot = setshoot;
		this.obj[cur_file].scaling = Math.min(stage_height, stage_width)/original_height;
		this.obj[cur_file].container = cont;
		this.obj[cur_file].magic = magic;
		this.obj[cur_file].was_doing = false;
		this.obj[cur_file].hwm_show_info_summon_wait = !!summon;

	};


	

	subdir = subdir_unit;
	if (mega){
		this.obj[cur_file].mega = true;
//		this.obj[cur_file].obj_index = 1;
		magic[1] = Array();
		magic[1]['meg'] = Array();
		magic[1]['meg']['effect'] = 1;
	};

	if (cur_file!='') {
		show_info_effects_setup(this.obj[cur_file], filename, obj_ver, subpath);
		this.obj[cur_file].add_obj('unit', filename, obj_ver, subpath, true, obj_inited_show, true);
	};

	for (k=1;k<=test_objs;k++)
	{
		this.obj[cur_file+k] = {};
		this.obj[cur_file+k].add_obj = add_obj;
		this.obj[cur_file+k].setshoot = setshoot;
		this.obj[cur_file+k].scaling = stage_height/original_height;
		this.obj[cur_file+k].container = cont;
		this.obj[cur_file+k].magic = magic;
		this.obj[cur_file+k].add_obj('unit', filename, obj_ver, subpath, true, obj_inited_show, true);
		this.obj[cur_file+k].sdvig_x = k*2;
	}

	subdir = '40';
	subdir = subdir_unit;

	
	if (is_summon){
		for (var i = 0; i<image_array.length;i++)
		{
			loadImage_url(image_array[i], subpath+"png_other/"+image_array[i]+".png",  0);
		}
		check_init();
	    
	};

	this.walk = walk;
	this.timer_show_army = function()
    {
	  var cur_file = this.filename;
	  if (!this.unit_layer.inited) this.unit_layer.check_css_init();

	  if (cur_file == '' || !this.obj[cur_file] || !this.obj[cur_file].inited_image) return 0;
	  show_info_effects_sync(this.obj[cur_file]);
	  if (!show_info_effects_ready(this.obj[cur_file])) return 0;
/*	  if (!this.unit_layer.fon_layer.inited){
		  this.unit_layer.fon_layer.add_fon_images();
		  return 0;
	  };*/

	  fps_c++;
	  if (Date.now()-fps_time>1000){
	    fps_time = Date.now();
		fps_c = 0;
	  };


	  if (this.is_summon && stage[si_container] === this) animate_summon();
	  
	  if ((this.obj[cur_file].mega)&&(!this.obj[cur_file].underFilter)&&(this.obj[cur_file].inited_image)){
//			  this.obj[cur_file].unit.filters([Konva.Filters.Contrast]);
//			  this.obj[cur_file].unit.contrast(30);
			  this.obj[cur_file].unit.filters([Konva.Filters.Mega]);
			  this.obj[cur_file].underFilter = 1;
			  this.obj[cur_file].need_refresh = 1;
			  this.obj[cur_file].need_cache = 1;
			  this.obj[cur_file].show_obj();
			  this.unit_layer.draw();
	  };


	  nframe++;
	if ((this.obj[cur_file].doing!='walk')&&(this.obj[cur_file].doing!='stopwalk')/*&&(this.obj[2].inited==true)*/){
	   // this.obj[2].layer.cache({pixelRatio: 1});
	};

	  for (var k=1;k<=test_objs;k++)
	  {
		  this.obj[cur_file+k].doing = 'walk';
		  this.obj[cur_file+k].animate_continue(1);
		  this.obj[cur_file+k].set_data();
	  }


	  if ((this.obj[cur_file].doing!='')&&(this.obj[cur_file].inited_image==1))
	  {
		  this.obj[cur_file].animate_continue(1);
		  this.obj[cur_file].set_data();
//		  this.obj[cur_file].layer.draw();
		  if (this.obj[cur_file].mega){
			  this.obj[cur_file].need_cache = 1;
			  this.obj[cur_file].show_obj();
		  };

	  }
	  if (this.obj[cur_file].doing=='walk') this.walk();
	  if ((this.obj[cur_file].doing=='walk')&&(Math.random()<0.03)&&(nframe-last_do_frame>25))
	  {
		  this.obj[cur_file].next_doing = 'stopwalk';
	  }
	  show_info_effects_sync(this.obj[cur_file]);
	  var effect_changed = show_info_effects_tick(this.obj[cur_file], Date.now());
	  if (old_cur_file && old_cur_file !== cur_file && this.obj[old_cur_file]) {
		  effect_changed = show_info_effects_tick(this.obj[old_cur_file], Date.now()) || effect_changed;
	  }
	  // Burn-loop огненного слоя существа (HWMCreatureBurn из бандла): в простое
	  // кадр пламени идёт непрерывно, doing не выставляется — ниже жест всё так же
	  // выбирается по doing_rate, и лишней перерисовки вхолостую нет. Сама
	  // отрисовка слоя — общая в конце функции, по effect_changed.
	  if (typeof HWMCreatureBurn !== 'undefined' && this.obj[cur_file].doing=='' && HWMCreatureBurn.advanceBurn(this.obj[cur_file])) {
		  this.obj[cur_file].set_data();
		  effect_changed = true;
	  }
	  if ((this.obj[cur_file].doing=='')&&(Math.random()<doing_rate))
	  {	
		  if ((was_do)||(!this.unit_layer.inited))
		  {
			  if (effect_changed) this.unit_layer.draw();
			  return 0;
		  }
//		  var doings = Array('attack', 'shoot', 'back', 'walk', 'free1', 'free2');
		  var doings = Array('attack', 'shoot', 'shoot2', 'cast', 'cast2', 'back', 'walk', 'free1', 'free2');
		  if (this.is_summon){
			  var doings = Array('free1', 'free2');
		  };
		  if (this.is_ohota){
			  var doings = Array('free1', 'free2', 'attack');
		  };
//		  doings = Array('walk');
		  
		  this.obj[cur_file].doing = doings[Math.floor(doings.length*Math.random())];
		  this.obj[cur_file].was_doing = true;
		  last_do_frame = nframe;
//		  was_do = 1;
	  }

	  if (textdebug)
	  {
		  requestAnimFrame();
	  }

	  if (effect_changed||(this.obj[cur_file].doing!='')||(this.obj[cur_file].last_doing!='')||(!this.obj[cur_file].was_doing)){
		  this.unit_layer.draw();
	  };
	  this.obj[cur_file].last_doing = this.obj[cur_file].doing;
    }


	var me = this;
	me.timer_show_army();
	this.interval = setInterval(function () {
		me.timer_show_army();
	}, timer_interval);
};


	var nframe=0;
	var need_test_cnt = 1;
	var last_do_frame=0;



function walk() {
	var cur_file = this.filename;
	var dx=0;
/*	if (this.obj[2].inited_image!=1)
	{
		return 0;
	}*/
	var wspeed = 20;

	if (this.obj[cur_file]['walkspeed']!=undefined)
	{
		wspeed = this.obj[cur_file]['walkspeed'];
		if (wspeed == 1000){
			wspeed = 1;
		    for (var i=1;i<=this.obj[cur_file]['statix_len'];i++)
		    {
			  if ((this.obj[cur_file].n_data[i][nda['curframe']]!=undefined)&&(this.obj[cur_file].n_data[i][nda['curframe']]>0)){
				  j = this.obj[cur_file].n_data[i][nda['curframe']];
			  }else{
				  j = i;
			  };
			  if (this.obj[cur_file]['image'+j]!=undefined)
			  if (this.obj[cur_file].n_data[i][nda['_visible']]==1)
			  {
				  wspeed = 0;
				  break;
			  };
			};
		};
	}

	if (wspeed==0)
	{
		dx=0;
	}else
		dx=animspeed*40/wspeed*3;
	
	
	this.unit_layer.walk_fon_images(dx);

	var sc = 1;
	
}


function obj_inited_show(){
	if (!show_info_effects_current(this)) return;
	var owner = this.hwm_show_info_owner;
	var is_summon = owner.is_summon;
	var is_ohota = owner.is_ohota;
	var j = 0;
	this.inited = true;
	this.inited_show = true;
	show_info_effects_hide(this, false);
//	var coordx = 150*this.stage_width/show_info_width;
	var coordx = 190*this.stage_width/show_info_width;
	if (this.sdvig_x) coordx -= this.sdvig_x;
	if (this.name=='unit')
	{
		if (is_summon) coordx = 150;
		if (this.mega){
			this.set_pos(coordx*this.scaling, 270*this.scaling, -35, 35);
		}else{
			if (is_ohota){
				var siz = 33;
				if (!this.big)
				{
					siz = 43;
				}
				this.set_pos(100*this.stage_width/show_info_width, 270*this.stage_height/show_info_height, siz, siz);
			}else{
				this.set_pos(coordx*this.scaling, 270*this.scaling, -30, 30);
			};

		};
		
		if (this.shadow)
		{
//			this.shadow_layer.clearCache();
			this.shadow_layer.cache({pixelRatio: 0.5});
			this.shadow_layer.scaleY(0.1);
		}
	
		
		this.layer.setZIndex(1);
		if (this.hwm_show_info_summon_wait){
			this.layer.visible(0);
		};
	}
	if (this.name=='myfon')
	{
		this.set_pos(302*this.scaling, 245*this.scaling, -150, 150);
		this.layer.setZIndex(0);
	}
//	this.layer.draw();
	this.doing='';
	this.last_doing = '';
	this.b_view = -1;
	this.setshoot(-200, 50, 0);
//	this.doing='free1';
	this.need_refresh = 1;
    if (show_info_effects_prepare_unit(this)) show_info_effects_sync(this);
    stage[this.container].unit_layer.draw();
	
};


var lastCalledTime=0;

function init_text_debug(){
	if (textdebug)
	{
		text = new Konva.Text({
		  x: 10,
		  y: 15,
		  text: 'Simple Text',
		  fontSize: 30,
		  fontFamily: 'Calibri',
		  fill: 'green'
		});
		fps=0;
		lastfps=0;
		layert = new Konva.FastLayer();
		layert.add(text);
		stage.add(layert);
		layert.draw();
	}

};


function requestAnimFrame() {
  if(!lastCalledTime) {
     lastCalledTime = Date.now();
     fps = 0;
     return;
  }
  delta = (Date.now() - lastCalledTime)/1000;
  lastCalledTime = Date.now();
  lastfps = fps;
  fps = 1/delta;
  layert.setZIndex(2000);
  layert.draw();
  text.setAttr('text', Math.round(fps)+' '+show_army_getMyPixelRatio(300)+' ');
}

function show_info_pre_init(){
	if ((typeof show_info_init_array !== 'undefined')&&(typeof Konva !== 'undefined')&&(typeof enginep_loaded !== 'undefined')){
		for (var j=1;j<=10;j++)
		{
			if (show_info_init_array[j])
			{
				init_army_info(show_info_init_array[j][0], show_info_init_array[j][1], show_info_init_array[j][2], show_info_init_array[j][3], show_info_init_array[j][4],
				show_info_init_array[j][5], show_info_init_array[j][6], show_info_init_array[j][7], 1, false, false, true, show_info_init_array[j][8]);
				show_info_init_array[j] = false;
			};
		}
	};
};
show_info_pre_init();
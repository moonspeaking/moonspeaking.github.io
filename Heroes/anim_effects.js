var shadow_has_effect = 1;
var advanced_effects_modeling = 1;

/*
 * Shared animation-effect contract for the HTML5 battle client.
 *
 * The effect editor may load this file to use the same document schema and
 * validation rules as the battle client. Editor-only UI and persistence code
 * must stay in editor_effects.js and must not be deployed with the game client.
 */
(function (root) {
    'use strict';

    var API_NAME = 'HWMBattleAnimEffects';
    var API_VERSION = 1;
    var SCHEMA_VERSION = 1;
    var PACKED_SCHEMA_VERSION = 2;
    var MAX_ATLAS_DIMENSION = 8192;
    var MAX_ATLAS_PIXELS = 25000000;
    var CATALOG_VERSION = 1;
    var MAX_BINDINGS = 200;
    var DEFAULT_CONFIG_BASE = 'i/effects/';
    var DEFAULT_ATLAS_BASE = 'i/effects/atlases/';
    var nanoPartMaps = new WeakMap();
    var embeddedDocumentIds = new WeakMap();
    var nextEmbeddedDocumentId = 0;

    var DATA_INDEX = {
        CURFRAME: 0,
        LASTFRAME: 1,
        VISIBLE: 2,
        ALPHA: 3,
        MATRIX: 6,
        MATRIX2: 7,
        NO_SHADOW: 8
    };

    var SELECTOR_TYPES = {
        STAND: 'stand',
        ALWAYS: 'always',
        ANIMATION: 'animation'
    };

    var TRIGGER_TYPES = {
        FRAME: 'frame',
        RANGE: 'range'
    };

    var PLAY_MODES = {
        ONCE: 'once',
        DURATION: 'duration',
        LOOP: 'loop'
    };

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function isFiniteNumber(value) {
        return typeof value === 'number' && isFinite(value);
    }

    function clockNow() {
        return root.performance && typeof root.performance.now === 'function'
            ? root.performance.now()
            : Date.now();
    }

    function trimmedString(value) {
        return typeof value === 'string' ? value.replace(/^\s+|\s+$/g, '') : '';
    }

    function addError(errors, path, code, message) {
        errors.push({
            path: path,
            code: code,
            message: message
        });
    }

    function rejectUnknownKeys(source, allowedKeys, path, errors) {
        var key;
        var allowed;
        var i;

        if (!isObject(source)) return;

        for (key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

            allowed = false;
            for (i = 0; i < allowedKeys.length; i++) {
                if (allowedKeys[i] === key) {
                    allowed = true;
                    break;
                }
            }
            if (!allowed) {
                addError(errors, path ? path + '.' + key : key, 'unknown_field', 'The field is not supported by this schema version.');
            }
        }
    }

    function readRequiredString(source, key, path, errors, pattern) {
        var value = trimmedString(source[key]);

        if (!value) {
            addError(errors, path, 'required_string', 'A non-empty string is required.');
            return '';
        }
        if (pattern && !pattern.test(value)) {
            addError(errors, path, 'invalid_string', 'The string contains unsupported characters.');
            return '';
        }

        return value;
    }

    function readNumber(source, key, fallback, path, errors, options) {
        var value = source[key];
        var opts = options || {};

        if (typeof value === 'undefined') return fallback;
        if (!isFiniteNumber(value)) {
            addError(errors, path, 'invalid_number', 'A finite number is required.');
            return fallback;
        }
        if (opts.integer && Math.floor(value) !== value) {
            addError(errors, path, 'integer_required', 'An integer is required.');
            return fallback;
        }
        if (typeof opts.min === 'number' && value < opts.min) {
            addError(errors, path, 'number_too_small', 'The value is below the allowed minimum.');
            return fallback;
        }
        if (typeof opts.max === 'number' && value > opts.max) {
            addError(errors, path, 'number_too_large', 'The value is above the allowed maximum.');
            return fallback;
        }

        return value;
    }

    function readRequiredNumber(source, key, fallback, path, errors, options) {
        if (typeof source[key] === 'undefined') {
            addError(errors, path, 'required_number', 'A number is required.');
            return fallback;
        }

        return readNumber(source, key, fallback, path, errors, options);
    }

    function normalizeCatalogEffect(rawEffect, index, errors) {
        var path = 'effects[' + index + ']';
        var effect = isObject(rawEffect) ? rawEffect : {};
        var result;

        if (!isObject(rawEffect)) addError(errors, path, 'invalid_effect', 'An effect object is required.');
        rejectUnknownKeys(effect, [
            'id', 'name', 'image', 'frameWidth', 'frameHeight', 'cols', 'rows',
            'frames', 'fps', 'drawWidth', 'drawHeight', 'anchorX', 'anchorY', 'blend',
            'atlasX', 'atlasY', 'atlasWidth', 'atlasHeight'
        ], path, errors);

        result = {
            id: readRequiredString(effect, 'id', path + '.id', errors, /^[A-Za-z0-9_-]+$/),
            name: readRequiredString(effect, 'name', path + '.name', errors),
            image: readRequiredString(effect, 'image', path + '.image', errors, /^[A-Za-z0-9_-]+\.png$/),
            frameWidth: readRequiredNumber(effect, 'frameWidth', 1, path + '.frameWidth', errors, { integer: true, min: 1, max: 4096 }),
            frameHeight: readRequiredNumber(effect, 'frameHeight', 1, path + '.frameHeight', errors, { integer: true, min: 1, max: 4096 }),
            cols: readRequiredNumber(effect, 'cols', 1, path + '.cols', errors, { integer: true, min: 1, max: 256 }),
            rows: readRequiredNumber(effect, 'rows', 1, path + '.rows', errors, { integer: true, min: 1, max: 256 }),
            frames: readRequiredNumber(effect, 'frames', 1, path + '.frames', errors, { integer: true, min: 1, max: 65536 }),
            fps: readRequiredNumber(effect, 'fps', 30, path + '.fps', errors, { min: 0.001, max: 240 }),
            drawWidth: readRequiredNumber(effect, 'drawWidth', 1, path + '.drawWidth', errors, { min: 0.001, max: 4096 }),
            drawHeight: readRequiredNumber(effect, 'drawHeight', 1, path + '.drawHeight', errors, { min: 0.001, max: 4096 }),
            anchorX: readRequiredNumber(effect, 'anchorX', 0, path + '.anchorX', errors, { min: 0, max: 4096 }),
            anchorY: readRequiredNumber(effect, 'anchorY', 0, path + '.anchorY', errors, { min: 0, max: 4096 }),
            blend: readRequiredString(effect, 'blend', path + '.blend', errors, /^(normal|lighter)$/)
        };

        if (typeof effect.atlasX !== 'undefined' || typeof effect.atlasY !== 'undefined' ||
                typeof effect.atlasWidth !== 'undefined' || typeof effect.atlasHeight !== 'undefined') {
            result.atlasX = readRequiredNumber(effect, 'atlasX', 0, path + '.atlasX', errors, { integer: true, min: 0, max: MAX_ATLAS_DIMENSION });
            result.atlasY = readRequiredNumber(effect, 'atlasY', 0, path + '.atlasY', errors, { integer: true, min: 0, max: MAX_ATLAS_DIMENSION });
            result.atlasWidth = readRequiredNumber(effect, 'atlasWidth', 1, path + '.atlasWidth', errors,
                { integer: true, min: 1, max: MAX_ATLAS_DIMENSION });
            result.atlasHeight = readRequiredNumber(effect, 'atlasHeight', 1, path + '.atlasHeight', errors,
                { integer: true, min: 1, max: MAX_ATLAS_DIMENSION });
            if (result.atlasWidth * result.atlasHeight > MAX_ATLAS_PIXELS) {
                addError(errors, path, 'atlas_too_large', 'The combined atlas exceeds the 25MP limit.');
            }
            if (result.atlasX + result.frameWidth * result.cols > result.atlasWidth ||
                    result.atlasY + result.frameHeight * result.rows > result.atlasHeight) {
                addError(errors, path, 'grid_outside_atlas', 'The animation grid must fit inside its atlas.');
            }
        }

        if (result.frames > result.cols * result.rows) {
            addError(errors, path + '.frames', 'frames_exceed_grid', 'Frame count exceeds the atlas grid.');
        }
        if (result.anchorX > result.frameWidth || result.anchorY > result.frameHeight) {
            addError(errors, path, 'anchor_outside_frame', 'The atlas anchor must be inside the source frame.');
        }

        return result;
    }

    function inspectCatalog(raw) {
        var errors = [];
        var source = parseInput(raw, errors);
        var effects;
        var normalizedEffects = [];
        var seenIds = {};
        var effect;
        var key;
        var i;

        if (!isObject(source)) {
            if (!errors.length) addError(errors, '', 'invalid_catalog', 'The effect catalog must be an object.');
            return { ok: false, catalog: null, errors: errors };
        }

        rejectUnknownKeys(source, ['version', 'effects'], '', errors);
        if (source.version !== CATALOG_VERSION) {
            addError(errors, 'version', 'unsupported_catalog_version', 'Unsupported effect-catalog version.');
        }
        effects = source.effects;
        if (!Array.isArray(effects)) {
            addError(errors, 'effects', 'effects_required', 'Catalog effects must be an array.');
            effects = [];
        }

        for (i = 0; i < effects.length; i++) {
            effect = normalizeCatalogEffect(effects[i], i, errors);
            key = '$' + effect.id;
            if (effect.id && seenIds[key]) {
                addError(errors, 'effects[' + i + '].id', 'duplicate_effect_id', 'Effect ids must be unique.');
            }
            if (effect.id) seenIds[key] = true;
            normalizedEffects.push(effect);
        }

        return {
            ok: errors.length === 0,
            catalog: errors.length === 0 ? { version: CATALOG_VERSION, effects: normalizedEffects } : null,
            errors: errors
        };
    }

    function prepareCatalog(raw) {
        return inspectCatalog(raw);
    }

    function catalogEffectMap(catalog) {
        var result = {};
        var effects = catalog && Array.isArray(catalog.effects) ? catalog.effects : [];
        var i;

        for (i = 0; i < effects.length; i++) result['$' + effects[i].id] = effects[i];
        return result;
    }

    function getCatalogEffect(catalog, effectId) {
        return catalogEffectMap(catalog)['$' + effectId] || null;
    }

    function normalizeSelector(rawSelector, path, errors) {
        var selector = isObject(rawSelector) ? rawSelector : {};
        var type = trimmedString(selector.type);
        var result = { type: type };

        if (!isObject(rawSelector)) {
            addError(errors, path, 'selector_required', 'A selector object is required.');
            return result;
        }
        rejectUnknownKeys(selector, ['type', 'animation'], path, errors);
        if (type !== SELECTOR_TYPES.STAND && type !== SELECTOR_TYPES.ALWAYS && type !== SELECTOR_TYPES.ANIMATION) {
            addError(errors, path + '.type', 'invalid_selector_type', 'Selector type must be stand, always, or animation.');
            return result;
        }
        if (type === SELECTOR_TYPES.ANIMATION) {
            result.animation = readRequiredString(selector, 'animation', path + '.animation', errors, /^[A-Za-z0-9_]+$/);
        } else if (typeof selector.animation !== 'undefined') {
            addError(errors, path + '.animation', 'animation_not_allowed', 'Stand and always selectors must not define an animation.');
        }

        return result;
    }

    function normalizeTrigger(rawTrigger, selectorType, path, errors) {
        var trigger;
        var type;
        var result;

        if (selectorType === SELECTOR_TYPES.STAND || selectorType === SELECTOR_TYPES.ALWAYS) {
            if (rawTrigger !== null && typeof rawTrigger !== 'undefined') {
                addError(errors, path, 'trigger_not_allowed', 'Stand and always selectors must not define a trigger.');
            }
            return null;
        }

        if (!isObject(rawTrigger)) {
            addError(errors, path, 'trigger_required', 'Animation selectors require a frame or range trigger.');
            return null;
        }

        trigger = rawTrigger;
        type = trimmedString(trigger.type);
        result = { type: type };

        if (type === TRIGGER_TYPES.FRAME) {
            rejectUnknownKeys(trigger, ['type', 'frame'], path, errors);
            result.frame = readRequiredNumber(trigger, 'frame', 1, path + '.frame', errors, { integer: true, min: 1 });
            return result;
        }
        if (type === TRIGGER_TYPES.RANGE) {
            rejectUnknownKeys(trigger, ['type', 'from', 'to'], path, errors);
            result.from = readRequiredNumber(trigger, 'from', 1, path + '.from', errors, { integer: true, min: 1 });
            result.to = readRequiredNumber(trigger, 'to', result.from, path + '.to', errors, { integer: true, min: 1 });
            if (result.to < result.from) {
                addError(errors, path, 'invalid_frame_range', 'Range end must not be lower than range start.');
            }
            return result;
        }

        rejectUnknownKeys(trigger, ['type'], path, errors);
        addError(errors, path + '.type', 'invalid_trigger_type', 'Trigger type must be frame or range.');
        return result;
    }

    function normalizeAnchor(rawAnchor, path, errors) {
        var anchor = isObject(rawAnchor) ? rawAnchor : {};

        if (!isObject(rawAnchor)) addError(errors, path, 'anchor_required', 'An anchor object is required.');
        rejectUnknownKeys(anchor, ['partPath', 'localX', 'localY'], path, errors);

        return {
            partPath: readRequiredString(anchor, 'partPath', path + '.partPath', errors, /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/),
            localX: readNumber(anchor, 'localX', 0, path + '.localX', errors),
            localY: readNumber(anchor, 'localY', 0, path + '.localY', errors)
        };
    }

    function normalizeStartFrame(rawStartFrame, path, errors) {
        var startFrame;
        var result;

        if (typeof rawStartFrame === 'undefined') return { from: 1, to: 1 };
        startFrame = isObject(rawStartFrame) ? rawStartFrame : {};
        if (!isObject(rawStartFrame)) {
            addError(errors, path, 'invalid_start_frame', 'Start frame must be an object.');
            return { from: 1, to: 1 };
        }
        rejectUnknownKeys(startFrame, ['from', 'to'], path, errors);
        result = {
            from: readRequiredNumber(startFrame, 'from', 1, path + '.from', errors, { integer: true, min: 1 }),
            to: readRequiredNumber(startFrame, 'to', 1, path + '.to', errors, { integer: true, min: 1 })
        };
        if (result.to < result.from) {
            addError(errors, path + '.to', 'invalid_start_frame_range', 'Start-frame range end must not be lower than its start.');
        }
        return result;
    }

    function normalizePlay(rawPlay, path, errors) {
        var play = isObject(rawPlay) ? rawPlay : {};
        var mode = trimmedString(play.mode);
        var result = {
            mode: mode,
            startFrame: normalizeStartFrame(play.startFrame, path + '.startFrame', errors)
        };

        if (!isObject(rawPlay)) {
            addError(errors, path, 'play_required', 'A play object is required.');
            return result;
        }
        rejectUnknownKeys(play, ['mode', 'durationMs', 'startFrame'], path, errors);
        if (mode !== PLAY_MODES.ONCE && mode !== PLAY_MODES.DURATION && mode !== PLAY_MODES.LOOP) {
            addError(errors, path + '.mode', 'invalid_play_mode', 'Play mode must be once, duration, or loop.');
            return result;
        }
        if (mode === PLAY_MODES.DURATION) {
            result.durationMs = readRequiredNumber(play, 'durationMs', 1, path + '.durationMs', errors, { min: 1 });
        } else if (typeof play.durationMs !== 'undefined') {
            addError(errors, path + '.durationMs', 'duration_not_allowed', 'Only duration mode may define durationMs.');
        }

        return result;
    }

    function normalizeTransform(rawTransform, path, errors) {
        var transform = isObject(rawTransform) ? rawTransform : {};
        var legacyScale;
        var inheritRotation = false;

        if (typeof rawTransform !== 'undefined' && !isObject(rawTransform)) {
            addError(errors, path, 'invalid_transform', 'Transform must be an object.');
        }
        rejectUnknownKeys(transform, ['offsetX', 'offsetY', 'scale', 'scaleX', 'scaleY', 'rotation', 'inheritRotation', 'alpha'], path, errors);
        legacyScale = readNumber(transform, 'scale', 1, path + '.scale', errors, { min: 0.000001 });
        if (typeof transform.inheritRotation !== 'undefined') {
            if (typeof transform.inheritRotation === 'boolean') inheritRotation = transform.inheritRotation;
            else addError(errors, path + '.inheritRotation', 'invalid_boolean', 'Inherit rotation must be a boolean.');
        }

        return {
            offsetX: readNumber(transform, 'offsetX', 0, path + '.offsetX', errors),
            offsetY: readNumber(transform, 'offsetY', 0, path + '.offsetY', errors),
            scaleX: readNumber(transform, 'scaleX', legacyScale, path + '.scaleX', errors, { min: 0.000001 }),
            scaleY: readNumber(transform, 'scaleY', legacyScale, path + '.scaleY', errors, { min: 0.000001 }),
            rotation: readNumber(transform, 'rotation', 0, path + '.rotation', errors),
            inheritRotation: inheritRotation,
            alpha: readNumber(transform, 'alpha', 1, path + '.alpha', errors, { min: 0, max: 1 })
        };
    }

    function normalizeAnimationFade(raw, path, errors) {
        var value = { enabled: false, rules: [] }, rules, rule, normalized, seen = {}, i, name, duration, field;
        if (typeof raw === 'undefined') return value;
        if (!isObject(raw)) {
            addError(errors, path, 'invalid_animation_fade', 'Animation fade must be an object.');
            return value;
        }
        rejectUnknownKeys(raw, ['enabled', 'rules'], path, errors);
        if (typeof raw.enabled !== 'boolean') {
            addError(errors, path + '.enabled', 'invalid_boolean', 'Animation fade enabled must be a boolean.');
        } else value.enabled = raw.enabled === true;
        rules = raw.rules;
        if (!Array.isArray(rules)) {
            addError(errors, path + '.rules', 'invalid_array', 'Animation fade rules must be an array.');
            return value;
        }
        if (rules.length > 128) addError(errors, path + '.rules', 'too_many_rules', 'At most 128 animation fade rules are supported.');
        for (i = 0; i < Math.min(128, rules.length); i++) {
            rule = isObject(rules[i]) ? rules[i] : {};
            name = path + '.rules[' + i + ']';
            if (!isObject(rules[i])) addError(errors, name, 'invalid_rule', 'An animation fade rule must be an object.');
            rejectUnknownKeys(rule, ['animation', 'fadeOut', 'fadeIn'], name, errors);
            normalized = { animation: readRequiredString(rule, 'animation', name + '.animation', errors, /^[A-Za-z0-9_]+$/) };
            if (seen['$' + normalized.animation]) addError(errors, name + '.animation', 'duplicate_animation', 'Animation fade rules must use unique names.');
            seen['$' + normalized.animation] = true;
            for (field = 0; field < 2; field++) {
                duration = field ? 'fadeIn' : 'fadeOut';
                normalized[duration] = readRequiredNumber(rule, duration, 0, name + '.' + duration, errors, { min: 0, max: 3600 });
                if (Math.abs(normalized[duration] * 10 - Math.round(normalized[duration] * 10)) > 0.000001) {
                    addError(errors, name + '.' + duration, 'invalid_step', 'Animation fade duration must use 0.1 second steps.');
                }
            }
            value.rules.push(normalized);
        }
        return value;
    }

    function inspectAnimationFade(raw) {
        var errors = [], value = normalizeAnimationFade(raw, 'animationFade', errors);
        return { ok: errors.length === 0, value: value, errors: errors };
    }

    function createAnimationFadeState() {
        return { alpha: 1, from: 1, target: 1, startedAt: 0, duration: 0, animation: '', token: null, rule: null, config: null, lastNow: 0 };
    }

    function updateAnimationFade(state, config, event, now) {
        var animation = event && typeof event.animation === 'string' ? event.animation : '';
        var token = event && typeof event.token !== 'undefined' ? event.token : null;
        var rule = null, duration, elapsed, i;
        now = isFiniteNumber(now) ? Math.max(state.lastNow, now) : state.lastNow;
        state.lastNow = now;
        if (!config || !config.enabled) {
            state.alpha = state.from = state.target = 1;
            state.duration = 0; state.rule = null; state.config = config;
            state.animation = ''; state.token = null;
            return 1;
        }
        elapsed = state.duration > 0 ? Math.min(1, Math.max(0, (now - state.startedAt) / state.duration)) : 1;
        state.alpha = state.from + (state.target - state.from) * elapsed;
        if (state.animation !== animation || state.token !== token || state.config !== config) {
            for (i = 0; animation && i < config.rules.length; i++) {
                if (config.rules[i].animation === animation) { rule = config.rules[i]; break; }
            }
            if (rule || state.rule) {
                duration = rule ? rule.fadeOut : state.rule.fadeIn;
                state.from = state.alpha;
                state.target = rule ? 0 : 1;
                state.startedAt = now;
                state.duration = duration * 1000;
                if (!state.duration) state.alpha = state.target;
            }
            state.animation = animation; state.token = token;
            state.rule = rule; state.config = config;
        }
        return state.alpha;
    }

    function unitAnimationFadeEvent(controller) {
        var unit = controller.unit;
        var event = controller.animationFadeEvent || (controller.animationFadeEvent = { animation: '', token: 0, frame: null, revision: null });
        var animation = typeof unit.doing === 'string' ? unit.doing : '';
        var frame = isFiniteNumber(unit.frame) ? unit.frame : null;
        var revision = typeof unit.hwm_effect_animation_revision === 'number' ? unit.hwm_effect_animation_revision : null;
        if (event.animation !== animation || (revision !== null && event.revision !== revision) ||
                (revision === null && animation && !unit.back_frame && frame !== null && event.frame !== null && frame < event.frame)) event.token++;
        event.animation = animation; event.frame = frame; event.revision = revision;
        return event;
    }

    function normalizeBinding(rawBinding, index, errors) {
        var path = 'bindings[' + index + ']';
        var binding = isObject(rawBinding) ? rawBinding : {};
        var enabled = typeof binding.enabled === 'undefined' ? true : binding.enabled;
        var hideAfterDead = typeof binding.hideAfterDead === 'undefined' ? true : binding.hideAfterDead;
        var layer = typeof binding.layer === 'undefined' ? 'above' : binding.layer;
        var selector;

        if (!isObject(rawBinding)) addError(errors, path, 'invalid_binding', 'A binding object is required.');
        rejectUnknownKeys(binding, ['id', 'enabled', 'hideAfterDead', 'animationFade', 'layer', 'selector', 'trigger', 'anchor', 'effectId', 'play', 'transform'], path, errors);
        if (typeof enabled !== 'boolean') {
            addError(errors, path + '.enabled', 'invalid_boolean', 'Enabled must be a boolean.');
            enabled = true;
        }

        if (typeof hideAfterDead !== 'boolean') {
            addError(errors, path + '.hideAfterDead', 'invalid_boolean', 'Hide after dead must be a boolean.');
            hideAfterDead = true;
        }

        if (layer !== 'above' && layer !== 'below' && layer !== 'auto' && layer !== 'part-below') {
            addError(errors, path + '.layer', 'invalid_layer', 'Layer must be above, below, auto, or part-below relative to its attached part.');
            layer = 'above';
        }

        selector = normalizeSelector(binding.selector, path + '.selector', errors);

        return {
            id: readRequiredString(binding, 'id', path + '.id', errors, /^[A-Za-z0-9_.-]+$/),
            enabled: enabled,
            hideAfterDead: hideAfterDead,
            animationFade: normalizeAnimationFade(binding.animationFade, path + '.animationFade', errors),
            layer: layer,
            selector: selector,
            trigger: normalizeTrigger(binding.trigger, selector.type, path + '.trigger', errors),
            anchor: normalizeAnchor(binding.anchor, path + '.anchor', errors),
            effectId: readRequiredString(binding, 'effectId', path + '.effectId', errors, /^[A-Za-z0-9_-]+$/),
            play: normalizePlay(binding.play, path + '.play', errors),
            transform: normalizeTransform(binding.transform, path + '.transform', errors)
        };
    }

    function parseInput(raw, errors) {
        if (typeof raw !== 'string') return raw;

        try {
            return JSON.parse(raw);
        } catch (error) {
            addError(errors, '', 'invalid_json', 'The effect document is not valid JSON.');
            return null;
        }
    }

    function inspectDocument(raw, rawCatalog) {
        var errors = [];
        var source = parseInput(raw, errors);
        var catalogResult = null;
        var effectMap = null;
        var documentValue;
        var bindings;
        var normalizedBindings = [];
        var seenBindingIds = {};
        var normalizedBinding;
        var bindingKey;
        var catalogEffect;
        var packed;
        var firstEffect;
        var field;
        var packedFields = ['atlasX', 'atlasY', 'atlasWidth', 'atlasHeight'];
        var i;
        var j;

        if (!isObject(source)) {
            if (!errors.length) addError(errors, '', 'invalid_document', 'The effect document must be an object.');
            return { ok: false, document: null, errors: errors };
        }

        packed = source.version === PACKED_SCHEMA_VERSION;
        rejectUnknownKeys(source, packed ? ['version', 'bindings', 'effects'] : ['version', 'bindings'], '', errors);

        if (source.version !== SCHEMA_VERSION && !packed) {
            addError(errors, 'version', 'unsupported_version', 'Unsupported animation-effect schema version.');
        }

        if (packed) {
            catalogResult = inspectCatalog({ version: CATALOG_VERSION, effects: source.effects });
            if (Array.isArray(source.effects)) {
                if (source.effects.length > MAX_BINDINGS) {
                    addError(errors, 'effects', 'too_many_effects', 'The document exceeds the maximum embedded effect count.');
                }
                for (i = 0; i < source.effects.length; i++) {
                    for (j = 0; j < packedFields.length; j++) {
                        field = packedFields[j];
                        if (!isObject(source.effects[i]) || typeof source.effects[i][field] === 'undefined') {
                            addError(errors, 'effects[' + i + '].' + field, 'required_number', 'Packed effects require every atlas coordinate and dimension.');
                        }
                    }
                }
            }
            if (catalogResult.ok) {
                firstEffect = catalogResult.catalog.effects[0];
                for (i = 1; i < catalogResult.catalog.effects.length; i++) {
                    catalogEffect = catalogResult.catalog.effects[i];
                    if (catalogEffect.image !== firstEffect.image ||
                            catalogEffect.atlasWidth !== firstEffect.atlasWidth || catalogEffect.atlasHeight !== firstEffect.atlasHeight) {
                        addError(errors, 'effects[' + i + ']', 'different_combined_atlas', 'Embedded effects must share one image and its dimensions.');
                    }
                }
            }
        } else if (rawCatalog) {
            catalogResult = inspectCatalog(rawCatalog);
        }
        effectMap = catalogResult && catalogResult.ok ? catalogEffectMap(catalogResult.catalog) : null;
        bindings = source.bindings;
        if (!Array.isArray(bindings)) {
            addError(errors, 'bindings', 'bindings_required', 'Bindings must be an array.');
            bindings = [];
        }
        if (bindings.length > MAX_BINDINGS) {
            addError(errors, 'bindings', 'too_many_bindings', 'The document exceeds the maximum binding count.');
        }

        if (catalogResult && !catalogResult.ok) {
            addError(errors, '', 'invalid_catalog', 'The supplied effect catalog is invalid.');
        }

        for (i = 0; i < bindings.length; i++) {
            normalizedBinding = normalizeBinding(bindings[i], i, errors);
            bindingKey = '$' + normalizedBinding.id;
            if (normalizedBinding.id && seenBindingIds[bindingKey]) {
                addError(errors, 'bindings[' + i + '].id', 'duplicate_binding_id', 'Binding ids must be unique.');
            }
            if (normalizedBinding.id) seenBindingIds[bindingKey] = true;
            catalogEffect = effectMap && normalizedBinding.effectId ? effectMap['$' + normalizedBinding.effectId] : null;
            if (effectMap && normalizedBinding.effectId && !catalogEffect) {
                addError(errors, 'bindings[' + i + '].effectId', 'unknown_effect_id', 'The effect id is not present in the catalog.');
            } else if (catalogEffect && normalizedBinding.play.startFrame.to > catalogEffect.frames) {
                addError(errors, 'bindings[' + i + '].play.startFrame.to', 'start_frame_outside_effect', 'Start frame must not exceed the effect frame count.');
            }
            normalizedBindings.push(normalizedBinding);
        }

        documentValue = {
            version: packed ? PACKED_SCHEMA_VERSION : SCHEMA_VERSION,
            bindings: normalizedBindings
        };
        if (packed && catalogResult && catalogResult.ok) documentValue.effects = catalogResult.catalog.effects;

        return {
            ok: errors.length === 0,
            document: errors.length === 0 ? documentValue : null,
            errors: errors
        };
    }

    function prepareDocument(raw, catalog) {
        return inspectDocument(raw, catalog);
    }

    function validateDocument(raw, catalog) {
        var result = inspectDocument(raw, catalog);

        return {
            ok: result.ok,
            errors: result.errors
        };
    }

    function matrixArray(value) {
        var source = value && value.m ? value.m : value;

        if (!source || source.length < 6) return [1, 0, 0, 1, 0, 0];
        return [
            Number(source[0]) || 0,
            Number(source[1]) || 0,
            Number(source[2]) || 0,
            Number(source[3]) || 0,
            Number(source[4]) || 0,
            Number(source[5]) || 0
        ];
    }

    function multiplyMatrices(left, right) {
        var a = matrixArray(left);
        var b = matrixArray(right);

        return [
            a[0] * b[0] + a[2] * b[1],
            a[1] * b[0] + a[3] * b[1],
            a[0] * b[2] + a[2] * b[3],
            a[1] * b[2] + a[3] * b[3],
            a[0] * b[4] + a[2] * b[5] + a[4],
            a[1] * b[4] + a[3] * b[5] + a[5]
        ];
    }

    function correctionMatrix(x, y, rotation, scaleX, scaleY) {
        var radians = rotation * Math.PI / 180;
        var cosine = Math.cos(radians);
        var sine = Math.sin(radians);

        return [cosine * scaleX, sine * scaleX, -sine * scaleY, cosine * scaleY, x, y];
    }

    function invertMatrix(matrix) {
        var m = matrixArray(matrix);
        var determinant = m[0] * m[3] - m[1] * m[2];

        if (Math.abs(determinant) < 0.000000001) return null;
        determinant = 1 / determinant;
        return [
            m[3] * determinant,
            -m[1] * determinant,
            -m[2] * determinant,
            m[0] * determinant,
            (m[2] * m[5] - m[3] * m[4]) * determinant,
            (m[1] * m[4] - m[0] * m[5]) * determinant
        ];
    }

    function transformPoint(matrix, x, y) {
        var m = matrixArray(matrix);

        return {
            x: m[0] * x + m[2] * y + m[4],
            y: m[1] * x + m[3] * y + m[5]
        };
    }

    function composeEffectMatrix(partMatrix, binding) {
        var part = matrixArray(partMatrix);
        var anchor = binding && isObject(binding.anchor) ? binding.anchor : {};
        var transform = binding && isObject(binding.transform) ? binding.transform : {};
        var localX = (isFiniteNumber(anchor.localX) ? anchor.localX : 0) + (isFiniteNumber(transform.offsetX) ? transform.offsetX : 0);
        var localY = (isFiniteNumber(anchor.localY) ? anchor.localY : 0) + (isFiniteNumber(transform.offsetY) ? transform.offsetY : 0);
        var rotation = isFiniteNumber(transform.rotation) ? transform.rotation : 0;
        var scaleX = isFiniteNumber(transform.scaleX) ? transform.scaleX : 1;
        var scaleY = isFiniteNumber(transform.scaleY) ? transform.scaleY : 1;
        var correction = correctionMatrix(localX, localY, rotation, scaleX, scaleY);
        var point;
        var partScaleX;
        var partScaleY;

        if (transform.inheritRotation === true) return multiplyMatrices(part, correction);

        point = transformPoint(part, localX, localY);
        partScaleX = Math.sqrt(part[0] * part[0] + part[1] * part[1]);
        partScaleY = Math.sqrt(part[2] * part[2] + part[3] * part[3]);
        return [
            correction[0] * partScaleX,
            correction[1] * partScaleX,
            correction[2] * partScaleY,
            correction[3] * partScaleY,
            point.x,
            point.y
        ];
    }

    function sameNumberArray(left, right) {
        var i;

        if (!left || !right || left.length !== right.length) return false;
        for (i = 0; i < left.length; i++) {
            if (left[i] !== right[i]) return false;
        }
        return true;
    }

    function buildPartPath(partId, statixData) {
        var names = [];
        var seen = {};
        var current = Number(partId) || 0;
        var part;
        var parent;
        var rootNames = { image_mc: true, all: true, telo: true };

        while (current > 0 && statixData && statixData[current] && !seen[current]) {
            seen[current] = true;
            part = statixData[current];
            if (trimmedString(part.name)) names.unshift(trimmedString(part.name));
            parent = Number(part.parent2 || part.parent || 0);
            current = parent > 0 ? parent : 0;
        }
        while (names.length > 1 && rootNames[String(names[0]).toLowerCase()]) names.shift();

        return names.join('.');
    }

    function getPartId(unit, partPath) {
        var statixData = unit && unit.statix_d;
        var wanted = trimmedString(partPath);
        var id;

        if (!statixData || !wanted) return 0;
        for (id = 1; id <= Number(unit.statix_len || 0); id++) {
            if (statixData[id] && buildPartPath(id, statixData) === wanted) return id;
        }
        return 0;
    }

    function getPartSprite(unit, partId) {
        var data = unit && unit.n_data && unit.n_data[partId];
        var frameId = data && Number(data[DATA_INDEX.CURFRAME]) > 0 ? Number(data[DATA_INDEX.CURFRAME]) : Number(partId);

        return unit && unit['image' + frameId] ? unit['image' + frameId] : null;
    }

    function nodeVisible(node) {
        if (!node) return false;
        if (node.konva_obj) {
            if (typeof node.isVisible === 'function') return !!node.isVisible();
            if (typeof node.visible === 'function') return !!node.visible();
        }
        if (node.pixi_obj) return node.worldVisible !== false && node.visible !== false;
        return true;
    }

    function nodeAbsoluteAlpha(node) {
        var alpha;

        if (!node) return 0;
        if (node.konva_obj && typeof node.getAbsoluteOpacity === 'function') {
            alpha = Number(node.getAbsoluteOpacity());
        } else if (node.pixi_obj && typeof node.worldAlpha !== 'undefined') {
            alpha = Number(node.worldAlpha);
        } else if (node.konva_obj && typeof node.opacity === 'function') {
            alpha = Number(node.opacity());
        } else {
            alpha = Number(node.alpha);
        }
        return isFinite(alpha) ? Math.max(0, alpha) : 1;
    }

    function inactiveNanoPart(unit, partId) {
        var statixData = unit.statix_d;
        var nano = statixData && statixData.nano_arts;
        var cache;
        var kinds = ['w', 'a', 'i'];
        var groups;
        var kind;
        var group;
        var level;
        var id;
        var entry;

        if (!nano) return false;
        cache = nanoPartMaps.get(statixData);
        if (!cache || cache.nano !== nano) {
            cache = { nano: nano, parts: {} };
            for (kind = 0; kind < kinds.length; kind++) {
                groups = nano[kinds[kind]] || [];
                for (group in groups) {
                    if (!Object.prototype.hasOwnProperty.call(groups, group)) continue;
                    for (level = 0; level < 3; level++) {
                        id = Number(groups[group] && groups[group][level]);
                        if (id > 0) cache.parts[id] = { kind: kinds[kind], level: level };
                    }
                }
            }
            nanoPartMaps.set(statixData, cache);
        }
        entry = cache.parts[partId];
        return !!entry && Number(unit['art_' + entry.kind] || 0) !== entry.level;
    }

    function logicalPartTreeVisible(unit, partId) {
        var pending = [{ id: Number(partId), required: true }];
        var visited = {};
        var current;
        var key;
        var id;
        var data;
        var part;

        while (pending.length) {
            current = pending.pop();
            id = current.id;
            key = id + ':' + current.required;
            if (!id || visited[key]) continue;
            visited[key] = true;
            data = unit.n_data && unit.n_data[id];
            if (!data || Number(data[DATA_INDEX.ALPHA]) <= 0) return false;
            // Nano replacements can refer to an inactive variant through parent2.
            // Keep the actual render-parent chain and all non-nano ancestors strict.
            if (Number(data[DATA_INDEX.VISIBLE]) !== 1 &&
                    (current.required || !inactiveNanoPart(unit, id))) return false;
            part = unit.statix_d && unit.statix_d[id];
            if (!part) continue;
            if (Number(part.parent) > 0) pending.push({ id: Number(part.parent), required: current.required });
            if (Number(part.parent2) > 0) pending.push({ id: Number(part.parent2), required: false });
        }
        return true;
    }

    function getUnitPartStateById(unit, partId) {
        partId = Number(partId) || 0;
        var data = partId && unit.n_data ? unit.n_data[partId] : null;
        var sprite = data ? getPartSprite(unit, partId) : null;
        var visible = !!(data && logicalPartTreeVisible(unit, partId) && nodeVisible(sprite));

        return {
            partId: partId,
            partPath: partId ? buildPartPath(partId, unit.statix_d) : '',
            sprite: sprite,
            visible: visible,
            alpha: visible ? nodeAbsoluteAlpha(sprite) : 0,
            matrix: data ? matrixArray(data[DATA_INDEX.MATRIX]) : [1, 0, 0, 1, 0, 0],
            bitmapMatrix: data ? matrixArray(data[DATA_INDEX.MATRIX2]) : [1, 0, 0, 1, 0, 0]
        };
    }

    function getUnitPartState(unit, partPath) {
        return getUnitPartStateById(unit, getPartId(unit, partPath));
    }

    function getCachedItemPartId(item, unit) {
        var statixData = unit && unit.statix_d;
        var statixLength = Number(unit && unit.statix_len || 0);

        if (item.partStatixData !== statixData || item.partStatixLength !== statixLength) {
            item.partStatixData = statixData;
            item.partStatixLength = statixLength;
            item.partId = getPartId(unit, item.binding.anchor.partPath);
        }
        return item.partId;
    }

    function listUnitParts(unit) {
        var result = [];
        var id;
        var path;
        var state;

        if (!unit || !unit.statix_d) return result;
        for (id = 1; id <= Number(unit.statix_len || 0); id++) {
            if (!unit.statix_d[id]) continue;
            path = buildPartPath(id, unit.statix_d);
            if (!path) continue;
            state = getUnitPartStateById(unit, id);
            result.push({
                id: id,
                path: path,
                name: trimmedString(unit.statix_d[id].name),
                visible: state.partId === id && state.visible,
                alpha: state.partId === id ? state.alpha : 0
            });
        }
        return result;
    }

    function setNodeVisible(node, visible) {
        var next = !!visible;

        if (!node) return false;
        if (node.hwm_anim_effects_visible === next) return false;
        if (node.konva_obj && typeof node.visible === 'function') node.visible(next);
        else node.visible = next;
        node.hwm_anim_effects_visible = next;
        return true;
    }

    function setNodeAlpha(node, alpha) {
        if (!node) return false;
        if (node.hwm_anim_effects_alpha === alpha) return false;
        if (node.konva_obj && typeof node.opacity === 'function') node.opacity(alpha);
        else node.alpha = alpha;
        node.hwm_anim_effects_alpha = alpha;
        return true;
    }

    function applyNodeMatrix(node, matrix) {
        var m = matrixArray(matrix);
        var nativeMatrix;
        var frameScale;
        var offsetX;
        var offsetY;
        var translatedX;
        var translatedY;

        if (!node) return false;
        if (sameNumberArray(node.hwm_anim_effects_matrix, m)) return false;
        if (node.konva_obj) {
            if (typeof root.MatrixTransform === 'function') {
                nativeMatrix = new root.MatrixTransform();
                nativeMatrix.m = m.slice();
            } else {
                nativeMatrix = { m: m.slice() };
            }
            offsetX = typeof node.offsetX === 'function' ? Number(node.offsetX()) : 0;
            offsetY = typeof node.offsetY === 'function' ? Number(node.offsetY()) : 0;
            if (!isFiniteNumber(offsetX)) offsetX = 0;
            if (!isFiniteNumber(offsetY)) offsetY = 0;
            // The packed Konva matrix path bypasses node offsets, so bake the atlas pivot into the affine translation.
            translatedX = nativeMatrix.m[4] - nativeMatrix.m[0] * offsetX - nativeMatrix.m[2] * offsetY;
            translatedY = nativeMatrix.m[5] - nativeMatrix.m[1] * offsetX - nativeMatrix.m[3] * offsetY;
            nativeMatrix.m[4] = translatedX;
            nativeMatrix.m[5] = translatedY;
            node.matrix = nativeMatrix;
            node._cache = {};
        } else if (node.pixi_obj && root.PIXI) {
            frameScale = node.hwm_anim_effects_frame_scale || [1, 1];
            // PIXI stores image dimensions in scale, which setFromMatrix replaces.
            nativeMatrix = new root.PIXI.Matrix(
                m[0] * frameScale[0], m[1] * frameScale[0],
                m[2] * frameScale[1], m[3] * frameScale[1], m[4], m[5]
            );
            node.transform.setFromMatrix(nativeMatrix);
        }
        node.hwm_anim_effects_matrix = m.slice();
        return true;
    }

    function syncNodeTransform(target, source) {
        var values;

        if (!target || !source) return false;
        if (target.konva_obj) {
            values = [
                typeof source.x === 'function' ? source.x() : 0,
                typeof source.y === 'function' ? source.y() : 0,
                typeof source.scaleX === 'function' ? source.scaleX() : 1,
                typeof source.scaleY === 'function' ? source.scaleY() : 1,
                typeof source.rotation === 'function' ? source.rotation() : 0,
                typeof source.skewX === 'function' ? source.skewX() : 0,
                typeof source.skewY === 'function' ? source.skewY() : 0,
                typeof source.offsetX === 'function' ? source.offsetX() : 0,
                typeof source.offsetY === 'function' ? source.offsetY() : 0
            ];
            if (sameNumberArray(target.hwm_anim_effects_transform, values)) return false;
            target.x(values[0]);
            target.y(values[1]);
            target.scaleX(values[2]);
            target.scaleY(values[3]);
            if (typeof target.rotation === 'function') target.rotation(values[4]);
            if (typeof target.skewX === 'function') target.skewX(values[5]);
            if (typeof target.skewY === 'function') target.skewY(values[6]);
            if (typeof target.offsetX === 'function') target.offsetX(values[7]);
            if (typeof target.offsetY === 'function') target.offsetY(values[8]);
        } else if (target.pixi_obj) {
            values = [
                source.position.x, source.position.y,
                source.scale.x, source.scale.y,
                source.pivot.x, source.pivot.y,
                source.skew.x, source.skew.y,
                source.rotation
            ];
            if (sameNumberArray(target.hwm_anim_effects_transform, values)) return false;
            target.position.copyFrom(source.position);
            target.scale.copyFrom(source.scale);
            target.pivot.copyFrom(source.pivot);
            target.skew.copyFrom(source.skew);
            target.rotation = source.rotation;
        } else {
            return false;
        }
        target.hwm_anim_effects_transform = values.slice();
        return true;
    }

    function setAtlasFrame(sprite, effect, frame) {
        var crop;

        if (sprite.hwm_anim_effects_frame === frame) return false;
        crop = {
            x: (effect.atlasX || 0) + (frame % effect.cols) * effect.frameWidth,
            y: (effect.atlasY || 0) + Math.floor(frame / effect.cols) * effect.frameHeight,
            width: effect.frameWidth,
            height: effect.frameHeight
        };

        if (sprite.konva_obj && typeof sprite.crop === 'function') {
            sprite.crop(crop);
        } else if (sprite.pixi_obj && root.PIXI) {
            sprite.texture.frame = new root.PIXI.Rectangle(crop.x, crop.y, crop.width, crop.height);
            if (typeof sprite.texture.updateUvs === 'function') sprite.texture.updateUvs();
        }
        sprite.hwm_anim_effects_frame = frame;
        return true;
    }

    var atlasImagePromises = {};
    var atlasImages = {};

    function assetUrl(url, version) {
        var hashIndex;
        var hash = '';
        var effectsVersion = root.anim_effects_ver;
        hashIndex = url.indexOf('#');
        if (hashIndex >= 0) {
            hash = url.substr(hashIndex);
            url = url.substr(0, hashIndex);
        }
        if (version !== null && typeof version !== 'undefined') {
            url += (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + encodeURIComponent(String(version));
        }
        if (effectsVersion !== null && typeof effectsVersion !== 'undefined') {
            url += (url.indexOf('?') < 0 ? '?' : '&') + 'anim_effects_ver=' + encodeURIComponent(String(effectsVersion));
        }
        return url + hash;
    }

    function assetTimeout(promise, label) {
        if (typeof root.setTimeout !== 'function' || typeof root.clearTimeout !== 'function') return promise;
        return new Promise(function (resolve, reject) {
            var timeout = Number(root.hwm_loader_image_decode_timeout) || 10000;
            var timer = root.setTimeout(function () {
                reject(new Error('Timed out loading ' + label + '.'));
            }, Math.max(1, timeout));
            promise.then(function (value) {
                root.clearTimeout(timer);
                resolve(value);
            }, function (error) {
                root.clearTimeout(timer);
                reject(error);
            });
        });
    }

    function loadAtlasImage(url) {
        var tracked;
        if (atlasImagePromises[url]) return atlasImagePromises[url];
        tracked = new Promise(function (resolve, reject) {
            var image = new root.Image();
            image.crossOrigin = 'Anonymous';
            var settled = false;
            var timer = null;
            function finish(error) {
                if (settled) return;
                settled = true;
                if (timer !== null) root.clearTimeout(timer);
                if (error) {
                    if (atlasImagePromises[url] === tracked) delete atlasImagePromises[url];
                    reject(error);
                } else {
                    atlasImages[url] = image;
                    resolve(image);
                }
            }
            if (typeof root.setTimeout === 'function' && typeof root.clearTimeout === 'function') {
                timer = root.setTimeout(function () {
                    finish(new Error('Timed out loading animation-effect atlas: ' + url));
                }, Math.max(1, Number(root.hwm_loader_image_decode_timeout) || 10000));
            }
            image.onload = function () { finish(null); };
            image.onerror = function () { finish(new Error('Cannot load animation-effect atlas: ' + url)); };
            image.src = url;
        });
        atlasImagePromises[url] = tracked;
        return tracked;
    }

    function validateAtlasImage(effect, image, url) {
        var width = typeof effect.atlasWidth === 'number' ? effect.atlasWidth : effect.frameWidth * effect.cols;
        var height = typeof effect.atlasHeight === 'number' ? effect.atlasHeight : effect.frameHeight * effect.rows;
        if (Number(image.naturalWidth || image.width) !== width || Number(image.naturalHeight || image.height) !== height) {
            if (atlasImages[url] === image) {
                delete atlasImages[url];
                delete atlasImagePromises[url];
            }
            throw new Error('The animation-effect atlas dimensions do not match its description: ' + effect.id + '.');
        }
        return image;
    }

    function requestControllerDraw(controller) {
        var layer;
        var battleStage;

        if (controller.rootNode && controller.rootNode.konva_obj) {
            layer = typeof controller.rootNode.getLayer === 'function' ? controller.rootNode.getLayer() : null;
            if (layer && typeof layer.batchDraw === 'function') layer.batchDraw();
        } else if (controller.rootNode && controller.rootNode.pixi_obj && root.stage && controller.unit) {
            battleStage = root.stage[controller.unit.container];
            if (battleStage && battleStage.app && typeof battleStage.app.render === 'function') battleStage.app.render();
        }
    }

    function clearControllerItems(controller) {
        var i;
        var sprite;
        var dirty = restorePartBelowCache(controller);
        if (typeof root.hwm_release_unit_part_below_effect_shadow === 'function') root.hwm_release_unit_part_below_effect_shadow(controller.unit);
        if (controller.partBelowActive) {
            clearBodyAncestorCaches(controller);
            controller.unit.cached = false;
            controller.unit.need_refresh = 1;
            controller.partBelowRestorePending = true;
        }
        controller.partBelowActive = false;
        if (controller.unit.hwm_part_below_controller === controller) controller.unit.hwm_part_below_controller = null;

        for (i = 0; i < controller.items.length; i++) {
            sprite = controller.items[i].sprite;
            if (!sprite) continue;
            if (typeof sprite.destroy === 'function') sprite.destroy();
            else if (typeof sprite.remove === 'function') sprite.remove();
            dirty = true;
        }
        controller.items = [];
        return dirty;
    }

    function selectorMatches(unit, selector) {
        if (selector.type === SELECTOR_TYPES.ALWAYS) return true;
        if (selector.type === SELECTOR_TYPES.STAND) return !unit.doing;
        return unit.doing === selector.animation;
    }

    function chooseStartFrameIndex(item) {
        var range = item.binding.play.mode === PLAY_MODES.LOOP ?
            { from: 1, to: item.effect.frames } : (item.binding.play.startFrame || { from: 1, to: 1 });
        var from = Math.max(1, Math.min(item.effect.frames, range.from));
        var to = Math.max(from, Math.min(item.effect.frames, range.to));
        var randomValue;

        if (to === from) return from - 1;
        randomValue = Number(item.random());
        if (!isFinite(randomValue) || randomValue < 0) randomValue = 0;
        if (randomValue >= 1) randomValue = 0.9999999999999999;
        return from - 1 + Math.floor(randomValue * (to - from + 1));
    }

    function startPlayback(item, now) {
        item.startedAt = now;
        item.startFrameIndex = chooseStartFrameIndex(item);
        item.running = true;
        item.finished = false;
    }

    function resetPlayback(item) {
        if (item.sharedPlayback) resetPlayback(item.sharedPlayback);
        item.startedAt = 0;
        item.running = false;
        item.finished = false;
        item.windowActive = false;
        item.lastFrame = null;
        item.startFrameIndex = 0;
    }

    function playbackFrame(item, unit, now) {
        var binding = item.binding;
        var selectorActive = selectorMatches(unit, binding.selector);
        var currentFrame = Number(unit.frame || 0);
        var backFrame = !!unit.back_frame;
        var trigger = binding.trigger;
        var windowActive = selectorActive;
        var crossed = false;
        var wrapped = false;
        var elapsed;
        var frameOffset;
        var frame;
        var remainingDuration;

        if (!selectorActive) {
            resetPlayback(item);
            item.selectorActive = false;
            return -1;
        }

        if (!item.selectorActive) resetPlayback(item);
        item.selectorActive = true;

        if (binding.selector.type === SELECTOR_TYPES.ANIMATION && trigger) {
            if (trigger.type === TRIGGER_TYPES.RANGE) {
                windowActive = currentFrame >= trigger.from && currentFrame <= trigger.to;
                if (windowActive && !item.windowActive) startPlayback(item, now);
                if (!windowActive) {
                    item.running = false;
                    item.finished = false;
                }
                item.windowActive = windowActive;
            } else {
                if (item.lastFrame !== null) {
                    wrapped = backFrame ? currentFrame > item.lastFrame : currentFrame < item.lastFrame;
                    if (wrapped) resetPlayback(item);
                }
                if (item.lastFrame === null) {
                    crossed = backFrame ? currentFrame <= trigger.frame : currentFrame >= trigger.frame;
                } else if (backFrame) {
                    crossed = item.lastFrame > trigger.frame && currentFrame <= trigger.frame;
                } else {
                    crossed = item.lastFrame < trigger.frame && currentFrame >= trigger.frame;
                }
                if (!item.running && !item.finished && crossed) startPlayback(item, now);
            }
        } else if (!item.running && !item.finished) {
            startPlayback(item, now);
        }

        item.lastFrame = currentFrame;
        if (!windowActive || !item.running) return -1;

        elapsed = Math.max(0, now - item.startedAt);
        frameOffset = Math.floor(elapsed * item.effect.fps / 1000);
        frame = item.startFrameIndex + frameOffset;
        remainingDuration = (item.effect.frames - item.startFrameIndex) * 1000 / item.effect.fps;
        if (binding.play.mode === PLAY_MODES.ONCE && elapsed >= remainingDuration) {
            item.running = false;
            item.finished = true;
            return -1;
        }
        if (binding.play.mode === PLAY_MODES.DURATION && elapsed >= binding.play.durationMs) {
            item.running = false;
            item.finished = true;
            return -1;
        }

        return frame % item.effect.frames;
    }

    function itemPlaybackFrame(item, unit, now) {
        var playback = item.sharedPlayback;
        var frame;

        if (!playback) {
            frame = playbackFrame(item, unit, now);
            item.shadowPlaybackFrame = frame;
            return frame;
        }
        if ((!item.sprite || item.spriteJustReady) && playback.running) playback.startedAt = now;
        frame = playbackFrame(playback, unit, now);
        item.startedAt = playback.startedAt;
        item.startFrameIndex = playback.startFrameIndex;
        item.running = playback.running;
        item.finished = playback.finished;
        item.windowActive = playback.windowActive;
        item.selectorActive = playback.selectorActive;
        item.lastFrame = playback.lastFrame;
        item.shadowPlaybackFrame = frame;
        return frame;
    }

    function nodeParent(node) {
        if (!node) return null;
        return typeof node.getParent === 'function' ? node.getParent() : node.parent;
    }

    function shadowNodeAlpha(node) {
        var alpha = 1;
        var value;
        while (node) {
            value = node.konva_obj && typeof node.opacity === 'function' ? Number(node.opacity()) : Number(node.alpha);
            if (isFinite(value)) alpha *= Math.max(0, value);
            node = nodeParent(node);
        }
        return alpha;
    }

    function shadowNodeVisible(node) {
        while (node) {
            if (node.konva_obj && typeof node.visible === 'function') {
                if (!node.visible()) return false;
            } else if (typeof node.visible !== 'undefined' && !node.visible) return false;
            node = nodeParent(node);
        }
        return true;
    }

    function captureUnitShadow(unit, frozenFrames) {
        var controller;
        var result = [];
        var unitAlpha;
        var item;
        var effect;
        var frame;
        var part;
        var matrix;
        var alpha;
        var image;
        var scaleX;
        var scaleY;
        var frozen = isObject(frozenFrames);
        var frameKey;
        var sibling;
        var siblingKey;
        var i;
        var j;

        if (Number(root.shadow_has_effect) !== 1 || !unit || !hasUnitEffects(unit)) return result;
        controller = unit.hwm_anim_effects_controller;
        if (!controller || controller.destroyed || unit.mvisible === false || !unit.mobject || !shadowNodeVisible(unit.mobject)) return result;
        unitAlpha = shadowNodeAlpha(unit.mobject);
        if (unitAlpha <= 0) return result;
        for (i = 0; i < controller.items.length; i++) {
            item = controller.items[i];
            if (!item.sprite || !item.binding.enabled || !item.running || item.finished || !selectorMatches(unit, item.binding.selector)) continue;
            if (!frozen && !item.shadowLiftVisible && !shadowNodeVisible(item.sprite)) continue;
            frameKey = '$' + item.binding.id;
            frame = item.sprite.hwm_anim_effects_frame;
            if (frozen) {
                if (Object.prototype.hasOwnProperty.call(frozenFrames, frameKey)) frame = frozenFrames[frameKey];
                else {
                    // Hidden nano variants have no rendered frame yet, but their shared playback already has a phase.
                    if (isFiniteNumber(item.shadowPlaybackFrame)) frame = item.shadowPlaybackFrame;
                    if (item.sharedPlayback) for (j = 0; j < controller.items.length; j++) {
                        sibling = controller.items[j]; siblingKey = '$' + sibling.binding.id;
                        if (sibling.sharedPlayback === item.sharedPlayback && Object.prototype.hasOwnProperty.call(frozenFrames, siblingKey)) {
                            frame = frozenFrames[siblingKey];
                            break;
                        }
                    }
                }
            }
            effect = item.effect;
            if (!isFiniteNumber(frame) || frame < 0 || frame >= effect.frames || Math.floor(frame) !== frame) continue;
            if (frozen) frozenFrames[frameKey] = frame;
            part = getUnitPartState(unit, item.binding.anchor.partPath);
            if (!part.visible || !part.partId || unit.n_data[part.partId][DATA_INDEX.NO_SHADOW]) continue;
            if (item.binding.hideAfterDead && controller.deathFade.alpha <= 0) continue;
            // A body pose is applied before the effect tick; use current part alpha and visibility for pinned frames.
            alpha = frozen ? shadowNodeAlpha(part.sprite) / unitAlpha * item.binding.transform.alpha *
                (item.binding.hideAfterDead ? controller.deathFade.alpha : 1) * item.animationFadeAlpha :
                (item.shadowLiftVisible ? item.shadowLiftAlpha : shadowNodeAlpha(item.sprite) / unitAlpha);
            alpha = Math.max(0, Math.min(1, alpha));
            image = atlasImages[item.atlasUrl];
            if (!(alpha > 0) || !image) continue;
            matrix = composeEffectMatrix(part.matrix, item.binding);
            scaleX = effect.drawWidth / effect.frameWidth;
            scaleY = effect.drawHeight / effect.frameHeight;
            // Source-frame pixels enter the same unprojected coordinates as ordinary shadow parts.
            matrix = multiplyMatrices(matrix, [scaleX, 0, 0, scaleY, -effect.anchorX * scaleX, -effect.anchorY * scaleY]);
            result.push({
                image: image,
                crop: {
                    x: (effect.atlasX || 0) + (frame % effect.cols) * effect.frameWidth,
                    y: (effect.atlasY || 0) + Math.floor(frame / effect.cols) * effect.frameHeight,
                    width: effect.frameWidth,
                    height: effect.frameHeight
                },
                matrix: matrix,
                alpha: alpha,
                frame: frame,
                effectId: effect.id,
                bindingId: item.binding.id,
                partId: part.partId
            });
        }
        return result;
    }

    function unitRootHierarchy(unit) {
        var nodes = [];
        var node = unit.mobject;

        while (node && node !== unit.layer) {
            nodes.push(node);
            node = nodeParent(node);
        }
        if (node !== unit.layer || !nodes.length) return null;
        return { nodes: nodes, branch: nodes[nodes.length - 1] };
    }

    function unitRootMatrix(hierarchy) {
        var matrix = [1, 0, 0, 1, 0, 0];
        var local;
        var node;
        var i;

        for (i = 0; i < hierarchy.nodes.length; i++) {
            node = hierarchy.nodes[i];
            if (node.konva_obj) {
                local = matrixArray(node.getTransform().getMatrix());
            } else {
                node.transform.updateLocalTransform();
                local = node.transform.localTransform;
                local = [local.a, local.b, local.c, local.d, local.tx, local.ty];
            }
            matrix = multiplyMatrices(local, matrix);
        }
        return matrix;
    }

    function syncRootTransform(target, source, matrix) {
        var changed = false;

        if (!matrix) {
            if (target.hwm_anim_effects_root_matrix) {
                if (target.konva_obj) {
                    target.matrix = null;
                    target._cache = {};
                }
                target.hwm_anim_effects_transform = null;
                target.hwm_anim_effects_matrix = null;
                target.hwm_anim_effects_root_matrix = false;
                changed = true;
            }
            changed = syncNodeTransform(target, source) || changed;
        } else {
            if (!target.hwm_anim_effects_root_matrix) {
                // The composed matrix already includes every ancestor pivot and offset.
                if (target.konva_obj) {
                    target.x(0);
                    target.y(0);
                    target.scaleX(1);
                    target.scaleY(1);
                    target.rotation(0);
                    target.skewX(0);
                    target.skewY(0);
                    target.offsetX(0);
                    target.offsetY(0);
                } else {
                    target.pivot.set(0, 0);
                }
                target.hwm_anim_effects_matrix = null;
                target.hwm_anim_effects_root_matrix = true;
            }
            changed = applyNodeMatrix(target, matrix);
        }
        if (changed && target.konva_obj && typeof target._clearSelfAndDescendantCache === 'function') {
            target._clearSelfAndDescendantCache('absoluteTransform');
        }
        return changed;
    }

    function syncRootOrder(controller, node, hierarchy, below) {
        var layer = controller.unit.layer;
        var branch = hierarchy.branch;
        var changed = false;
        var nodeIndex;
        var branchIndex;
        var targetIndex;

        // Animated roots stay outside the cached creature branch.
        if (nodeParent(node) !== layer) {
            root.Make_addChild(layer, node);
            changed = true;
        }
        if (node.konva_obj && typeof node.getZIndex === 'function' && typeof branch.getZIndex === 'function') {
            nodeIndex = node.getZIndex();
            branchIndex = branch.getZIndex();
        } else if (node.pixi_obj && typeof layer.getChildIndex === 'function' && typeof layer.setChildIndex === 'function') {
            nodeIndex = layer.getChildIndex(node);
            branchIndex = layer.getChildIndex(branch);
        } else {
            return changed;
        }
        targetIndex = below ? (nodeIndex < branchIndex ? branchIndex - 1 : branchIndex) :
            (nodeIndex < branchIndex ? branchIndex : nodeIndex);
        if (nodeIndex !== targetIndex) {
            if (node.konva_obj) node.setZIndex(targetIndex);
            else layer.setChildIndex(node, targetIndex);
            changed = true;
        }
        return changed;
    }

    function localNodeMatrix(node) {
        var matrix;
        if (node.konva_obj) return matrixArray(node.getTransform().getMatrix());
        node.transform.updateLocalTransform();
        matrix = node.transform.localTransform;
        return [matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty];
    }

    function autoPartParent(controller, partState) {
        var unit = controller.unit;
        var parent = nodeParent(partState.sprite);
        var node = parent;
        var matrix = [1, 0, 0, 1, 0, 0];
        var inverse;
        var reached = false;

        if (!unit.doing || unit.cached || !parent) return null;
        while (node && node !== unit.layer) {
            if ((node.pixi_obj && node.cacheAsBitmap) ||
                (node.konva_obj && ((node._cache && node._cache.canvas) ||
                    (typeof node.isCached === 'function' && node.isCached())))) return null;
            if (node === unit.mobject) reached = true;
            else if (!reached) matrix = multiplyMatrices(localNodeMatrix(node), matrix);
            node = nodeParent(node);
        }
        if (!reached || node !== unit.layer) return null;
        inverse = invertMatrix(matrix);
        return inverse ? { parent: parent, matrix: inverse } : null;
    }

    function moveAutoSprite(controller, item, parent) {
        if (nodeParent(item.sprite) === parent) return false;
        root.Make_addChild(parent, item.sprite);
        item.sprite.hwm_anim_effects_matrix = null;
        if (item.sprite.konva_obj && typeof item.sprite._clearSelfAndDescendantCache === 'function') {
            item.sprite._clearSelfAndDescendantCache('absoluteTransform');
        }
        return true;
    }

    function orderAutoSprite(controller, item, partSprite, parent, itemIndex) {
        var reference = partSprite;
        var changed = false;
        var previous;
        var children;
        var depth;
        var gap = 1;
        var candidate;
        var index;
        var referenceIndex;
        var targetIndex;
        var i;

        if (item.sprite.pixi_obj) {
            children = parent.children || [];
            depth = Number(partSprite.zIndex) || 0;
            for (i = 0; i < children.length; i++) {
                if (children[i].hwm_anim_effects_auto) continue;
                candidate = Number(children[i].zIndex) - depth;
                if (candidate > 0 && candidate < gap) gap = candidate;
            }
            candidate = depth + gap * (itemIndex + 1) / (controller.items.length + 1);
            if (item.sprite.zIndex !== candidate) {
                item.sprite.zIndex = candidate;
                changed = true;
            }
            if (parent.sortableChildren && parent.sortDirty && typeof parent.sortChildren === 'function') {
                parent.sortChildren();
                changed = true;
            }
            if (parent.sortableChildren) return changed;
        }
        for (i = 0; i < itemIndex; i++) {
            previous = controller.items[i];
            if (previous.autoPartSprite === partSprite && nodeParent(previous.sprite) === parent) reference = previous.sprite;
        }
        if (item.sprite.konva_obj) {
            index = item.sprite.getZIndex();
            referenceIndex = reference.getZIndex();
        } else if (typeof parent.getChildIndex === 'function' && typeof parent.setChildIndex === 'function') {
            index = parent.getChildIndex(item.sprite);
            referenceIndex = parent.getChildIndex(reference);
        } else return changed;
        targetIndex = index <= referenceIndex ? referenceIndex : referenceIndex + 1;
        if (index !== targetIndex) {
            if (item.sprite.konva_obj) item.sprite.setZIndex(targetIndex);
            else parent.setChildIndex(item.sprite, targetIndex);
            changed = true;
        }
        return changed;
    }

    function liftAutoSprites(controller) {
        var item;
        var unitAlpha;
        var i;
        for (i = 0; i < controller.items.length; i++) {
            item = controller.items[i];
            if (item.binding.layer !== 'auto' || !item.sprite) continue;
            if (nodeParent(item.sprite) !== controller.rootNode) {
                unitAlpha = shadowNodeAlpha(controller.unit.mobject);
                item.shadowLiftVisible = shadowNodeVisible(item.sprite);
                item.shadowLiftAlpha = unitAlpha > 0 ? shadowNodeAlpha(item.sprite) / unitAlpha : 0;
            }
            if (moveAutoSprite(controller, item, controller.rootNode)) {
                // Remove live effects before show_obj can flatten any creature branch.
                setNodeVisible(item.sprite, false);
                item.autoPartSprite = null;
                controller.pendingDraw = true;
            }
        }
    }

    function syncAutoCacheHook(controller) {
        var needsHook = false;
        var original;
        var i;
        for (i = 0; i < controller.items.length; i++) {
            if (controller.items[i].binding.layer === 'auto') needsHook = true;
        }
        if (!needsHook) {
            if (controller.showObjectHook && controller.unit.show_obj === controller.showObjectHook) {
                controller.unit.show_obj = controller.originalShowObject;
            }
            controller.showObjectHook = null;
            controller.originalShowObject = null;
        } else if (!controller.showObjectHook && typeof controller.unit.show_obj === 'function') {
            original = controller.unit.show_obj;
            controller.originalShowObject = original;
            controller.showObjectHook = function () {
                if (!controller.destroyed) liftAutoSprites(controller);
                return original.apply(this, arguments);
            };
            controller.unit.show_obj = controller.showObjectHook;
        }
    }

    function bodyChildren(node) {
        var children = node.konva_obj && typeof node.getChildren === 'function' ? node.getChildren() : node.children;
        return children ? Array.prototype.slice.call(children) : [];
    }

    function clearBodyAncestorCaches(controller) {
        controller.partBelowFiltersDirty = true;
        var node = controller.unit.unit;
        while (node && node !== controller.unit.layer) {
            if (node.pixi_obj && node.cacheAsBitmap) node.cacheAsBitmap = false;
            if (node.konva_obj && typeof node.clearCache === 'function') node.clearCache();
            node = nodeParent(node);
        }
    }

    function refreshPartBelowFilters(controller) {
        controller.partBelowFiltersDirty = false;
        var nodes = [], node = controller.unit.unit;
        if (!controller.partBelowActive || !node || !node.konva_obj) return;
        while (node && node !== controller.unit.layer) {
            if (typeof node.filters === 'function' && node.filters() && node.filters().length) nodes.push(node);
            node = nodeParent(node);
        }
        // Recompose filtered cached segments and the current effect; never rebuild the body segment caches here.
        for (var i = nodes.length - 1; i >= 0; i--) nodes[i].clearCache();
        for (i = 0; i < nodes.length; i++) nodes[i].cache();
    }

    function liftPartBelowSprites(controller) {
        var dirty = false;
        for (var i = 0; i < controller.items.length; i++) {
            var item = controller.items[i];
            if (item.binding.layer !== 'part-below' || !item.sprite || item.sprite.destroyed || item.sprite._destroyed) continue;
            ensureBelowRoot(controller);
            if (nodeParent(item.sprite) !== controller.belowRootNode) {
                var alpha = shadowNodeAlpha(controller.unit.mobject);
                item.shadowLiftVisible = shadowNodeVisible(item.sprite);
                item.shadowLiftAlpha = alpha > 0 ? shadowNodeAlpha(item.sprite) / alpha : 0;
                dirty = moveAutoSprite(controller, item, controller.belowRootNode) || dirty;
                setNodeVisible(item.sprite, false);
                item.partBelowReference = null;
            }
        }
        return dirty;
    }

    function restorePartBelowCache(controller) {
        var state = controller.partBelowState;
        var dirty = liftPartBelowSprites(controller);
        if (!state) return dirty;
        clearBodyAncestorCaches(controller);
        var parent = state.parent;
        if (!parent.destroyed && !parent._destroyed && !controller.unit.cleared) {
            for (var i = 0; i < state.body.length; i++) {
                var part = state.body[i];
                if (!part.destroyed && !part._destroyed && nodeParent(part) && nodeParent(part).hwm_part_below_segment) {
                    root.Make_addChild(parent, part);
                }
            }
            parent.sortableChildren = state.sortable;
        }
        for (i = 0; i < state.groups.length; i++) {
            var group = state.groups[i];
            if (group.pixi_obj && group.cacheAsBitmap) group.cacheAsBitmap = false;
            if (group.konva_obj && typeof group.clearCache === 'function') group.clearCache();
            if (!group.destroyed && !group._destroyed && typeof group.destroy === 'function') group.destroy();
            else if (typeof group.remove === 'function') group.remove();
        }
        controller.partBelowState = null;
        controller.unit.cached = false;
        controller.unit.need_refresh = 1;
        return true;
    }

    function hasPartBelowBindings(controller) {
        if (Number(root.advanced_effects_modeling) !== 1 || !controller.unit.unit) return false;
        for (var i = 0; i < controller.items.length; i++) {
            var item = controller.items[i];
            if (item.binding.layer === 'part-below' && item.binding.enabled && item.sprite) return true;
        }
        return false;
    }

    function needsLeafBodyCaches(unit) {
        var node = unit.unit;
        while (node) {
            var alpha = node.konva_obj && typeof node.opacity === 'function' ? Number(node.opacity()) : Number(node.alpha);
            if (isFinite(alpha) && alpha !== 1) return true;
            node = nodeParent(node);
        }
        return false;
    }

    function syncPartBelowCache(controller, staticMode, refresh) {
        if (!controller || controller.destroyed) return false;
        if (!hasPartBelowBindings(controller)) {
            if (typeof root.hwm_release_unit_part_below_effect_shadow === 'function') root.hwm_release_unit_part_below_effect_shadow(controller.unit);
            if (controller.partBelowActive || controller.partBelowState) {
                restorePartBelowCache(controller);
                clearBodyAncestorCaches(controller);
                controller.partBelowActive = false;
                if (controller.unit.hwm_part_below_controller === controller) controller.unit.hwm_part_below_controller = null;
                controller.unit.cached = false;
                controller.unit.need_refresh = 1;
            }
            return false;
        }
        var entered = !controller.partBelowActive;
        controller.partBelowActive = true;
        controller.unit.hwm_part_below_controller = controller;
        if (!staticMode) {
            if (controller.partBelowState) {
                restorePartBelowCache(controller);
                clearBodyAncestorCaches(controller);
            } else if (entered) clearBodyAncestorCaches(controller);
            controller.unit.cached = false;
            return true;
        }
        var leafMode = needsLeafBodyCaches(controller.unit);
        if (controller.partBelowState && !refresh && controller.partBelowState.leafMode === leafMode) return true;
        restorePartBelowCache(controller);
        clearBodyAncestorCaches(controller);
        var parent = controller.unit.unit;
        if (parent.pixi_obj && parent.sortableChildren && typeof parent.sortChildren === 'function') parent.sortChildren();
        var children = bodyChildren(parent), body = [], boundaries = [], i, j;
        for (i = 0; i < children.length; i++) {
            if (!children[i].hwm_anim_effects_auto && !children[i].hwm_anim_effects_part_below) body.push(children[i]);
        }
        for (i = 0; i < controller.items.length; i++) {
            var item = controller.items[i];
            // Pending atlases already reserve their cut, so later readiness cannot attach below a wider segment.
            if (item.binding.layer !== 'part-below' || !item.binding.enabled) continue;
            var part = getPartSprite(controller.unit, getCachedItemPartId(item, controller.unit));
            for (j = 0; j < body.length; j++) if (body[j] === part) boundaries[j] = true;
        }
        // Applying ancestor opacity once to overlapping cached leaves would change their source-over result.
        // Rare translucent ancestors retain one cache per leaf; ordinary opaque units use only the effect cuts.
        var state = { parent: parent, body: body, groups: [], sortable: parent.sortableChildren, leafMode: leafMode };
        controller.partBelowState = state;
        parent.sortableChildren = false;
        var group = null;
        for (i = 0; i < body.length; i++) {
            if (!group || boundaries[i] || leafMode) {
                group = root.Make_Sprite();
                group.hwm_part_below_segment = true;
                group.hwm_part_below_first = body[i];
                state.groups.push(group);
                root.Make_addChild(parent, group);
            }
            root.Make_addChild(group, body[i]);
        }
        for (i = 0; i < state.groups.length; i++) {
            group = state.groups[i];
            // The same native cache correction also protects filtered children at negative body coordinates.
            if (group.pixi_obj && typeof root.hwm_init_pixi_effect_shadow_cache === 'function') {
                group.hwm_effect_shadow_cache_init = group._initCachedDisplayObject;
                group._initCachedDisplayObject = root.hwm_init_pixi_effect_shadow_cache;
            }
            var bounds = group.konva_obj ? group.getClientRect({ skipTransform: true }) : group.getLocalBounds();
            if (bounds.width > 0 && bounds.height > 0) {
                if (group.konva_obj) group.cache();
                else group.cacheAsBitmap = true;
            }
        }
        controller.unit.cached = true;
        controller.unit.need_refresh = 0;
        controller.pendingDraw = true;
        return true;
    }

    function syncUnitPartBelowCache(unit, staticMode, refresh) {
        var controller = unit && (unit.hwm_anim_effects_controller || unit.hwm_part_below_controller);
        if (!controller) return false;
        var active = syncPartBelowCache(controller, staticMode, refresh);
        if (active && controller.partBelowFiltersDirty) refreshPartBelowFilters(controller);
        return active;
    }

    function restoreUnitPartBelowCache(unit) {
        var controller = unit && (unit.hwm_anim_effects_controller || unit.hwm_part_below_controller);
        if (controller && (controller.partBelowActive || controller.partBelowState)) {
            restorePartBelowCache(controller);
            clearBodyAncestorCaches(controller);
        }
    }

    function partBelowParent(controller, partState) {
        var parent = controller.unit.unit;
        var reference = partState.sprite;
        var node = reference && nodeParent(reference);
        if (!controller.partBelowActive || !parent || !node) return null;
        if (node.hwm_part_below_segment && nodeParent(node) === parent) reference = node;
        else if (node !== parent) return null;
        var matrix = [1, 0, 0, 1, 0, 0];
        node = parent;
        while (node && node !== controller.unit.mobject) {
            matrix = multiplyMatrices(localNodeMatrix(node), matrix);
            node = nodeParent(node);
        }
        var inverse = node ? invertMatrix(matrix) : null;
        return inverse ? { parent: parent, reference: reference, matrix: inverse } : null;
    }

    function orderPartBelowSprite(controller, item, reference, parent, itemIndex) {
        var changed = false, children, depth, gap = 1, candidate, i;
        if (item.sprite.pixi_obj && parent.sortableChildren) {
            children = parent.children || [];
            depth = Number(reference.zIndex) || 0;
            for (i = 0; i < children.length; i++) {
                if (children[i].hwm_anim_effects_auto || children[i].hwm_anim_effects_part_below) continue;
                candidate = depth - Number(children[i].zIndex);
                if (candidate > 0 && candidate < gap) gap = candidate;
            }
            candidate = depth - gap * (controller.items.length - itemIndex) / (controller.items.length + 1);
            if (item.sprite.zIndex !== candidate) { item.sprite.zIndex = candidate; changed = true; }
            if (parent.sortDirty && typeof parent.sortChildren === 'function') { parent.sortChildren(); changed = true; }
            return changed;
        }
        // Insert in reverse binding order before the common reference, keeping duplicates stable.
        for (i = itemIndex + 1; i < controller.items.length; i++) {
            var next = controller.items[i];
            if (next.partBelowReference === reference && next.sprite && nodeParent(next.sprite) === parent) {
                reference = next.sprite;
                break;
            }
        }
        var index = item.sprite.konva_obj ? item.sprite.getZIndex() : parent.getChildIndex(item.sprite);
        var referenceIndex = reference.konva_obj ? reference.getZIndex() : parent.getChildIndex(reference);
        var target = index < referenceIndex ? referenceIndex - 1 : referenceIndex;
        if (index !== target) {
            if (item.sprite.konva_obj) item.sprite.setZIndex(target);
            else parent.setChildIndex(item.sprite, target);
            changed = true;
        }
        return changed;
    }

    function ensureBelowRoot(controller) {
        var hierarchy;

        if (controller.belowRootNode) return;
        controller.belowRootNode = root.Make_Sprite();
        controller.belowRootNode.hwm_anim_effects_layer = true;
        setNodeVisible(controller.belowRootNode, false);
        root.Make_addChild(controller.unit.layer, controller.belowRootNode);
        hierarchy = unitRootHierarchy(controller.unit);
        if (hierarchy) syncRootOrder(controller, controller.belowRootNode, hierarchy, true);
        controller.pendingDraw = true;
    }

    function makeEffectSprite(controller, item, image) {
        var effect = item.effect;
        var sprite;
        if (typeof effect.atlasWidth === 'number') validateAtlasImage(effect, image, item.atlasUrl);
        sprite = root.My_Image({
            x: 0,
            y: 0,
            image: image,
            width: effect.drawWidth,
            height: effect.drawHeight,
            crop: { x: effect.atlasX || 0, y: effect.atlasY || 0, width: effect.frameWidth, height: effect.frameHeight },
            offsetX: effect.anchorX / effect.frameWidth * effect.drawWidth,
            offsetY: effect.anchorY / effect.frameHeight * effect.drawHeight,
            visible: 0,
            listening: false,
            perfectDrawEnabled: false
        });

        if (sprite.pixi_obj) {
            sprite.hwm_anim_effects_frame_scale = [effect.drawWidth / effect.frameWidth, effect.drawHeight / effect.frameHeight];
        }
        if (effect.blend === 'lighter') {
            if (sprite.konva_obj && typeof sprite.globalCompositeOperation === 'function') sprite.globalCompositeOperation('lighter');
            if (sprite.pixi_obj && root.PIXI && root.PIXI.BLEND_MODES) sprite.blendMode = root.PIXI.BLEND_MODES.ADD;
        }
        root.Make_addChild(item.binding.layer === 'below' || item.binding.layer === 'part-below' ? controller.belowRootNode : controller.rootNode, sprite);
        sprite.hwm_anim_effects_auto = item.binding.layer === 'auto';
        sprite.hwm_anim_effects_part_below = item.binding.layer === 'part-below';
        item.sprite = sprite;
        item.spriteJustReady = true;
        return sprite;
    }

    function rebuildController(controller, documentValue) {
        var generation = ++controller.generation;
        var playbackGroups = {};
        var playbackKey;
        var firstItem;
        var map = catalogEffectMap(controller.catalog);
        var base = documentValue.version === PACKED_SCHEMA_VERSION && !controller.options.embedded ?
            ensureTrailingSlash(controller.options.configBase, DEFAULT_CONFIG_BASE) :
            ensureTrailingSlash(controller.options.atlasBase, DEFAULT_ATLAS_BASE);
        var binding;
        var effect;
        var item;
        var i;

        controller.pendingDraw = clearControllerItems(controller) || controller.pendingDraw;
        controller.document = documentValue;
        for (i = 0; i < documentValue.bindings.length; i++) {
            binding = documentValue.bindings[i];
            if (binding.layer === 'below' || binding.layer === 'part-below') ensureBelowRoot(controller);
            effect = map['$' + binding.effectId];
            item = {
                binding: binding,
                effect: effect,
                sprite: null,
                selectorActive: false,
                windowActive: false,
                running: false,
                finished: false,
                startedAt: 0,
                startFrameIndex: 0,
                random: typeof controller.options.random === 'function' ? controller.options.random : Math.random,
                lastFrame: null,
                animationFadeState: createAnimationFadeState(),
                animationFadeAlpha: 1,
                spriteJustReady: false,
                partId: 0,
                partStatixData: null,
                partStatixLength: -1
            };
            playbackKey = JSON.stringify([binding.effectId, binding.selector, binding.trigger, binding.play, binding.hideAfterDead]);
            firstItem = playbackGroups[playbackKey];
            if (firstItem) {
                if (!firstItem.sharedPlayback) {
                    firstItem.sharedPlayback = { binding: firstItem.binding, effect: effect, random: firstItem.random, selectorActive: false };
                    resetPlayback(firstItem.sharedPlayback);
                }
                item.sharedPlayback = firstItem.sharedPlayback;
            } else playbackGroups[playbackKey] = item;
            controller.items.push(item);
            (function (targetItem) {
                var url = assetUrl(base + targetItem.effect.image, controller.options.version);
                targetItem.atlasUrl = url;
                if (atlasImages[url]) {
                    makeEffectSprite(controller, targetItem, atlasImages[url]);
                    return;
                }
                loadAtlasImage(url).then(function (image) {
                    if (!controller.destroyed && generation === controller.generation) {
                        makeEffectSprite(controller, targetItem, image);
                    }
                }).catch(function (error) {
                    if (!controller.destroyed && generation === controller.generation && typeof controller.options.onError === 'function') {
                        controller.options.onError(error);
                    }
                });
            }(item));
        }
        syncAutoCacheHook(controller);
    }

    function deathFadeAlpha(controller, now) {
        var unit = controller.unit;
        var doing = typeof unit.doing === 'string' ? unit.doing : '';
        var dying = doing.substr(0, 3) === 'die';
        var resurrecting = doing.substr(0, 4) === 'rise' || (dying && !!unit.back_frame);
        var dead = unit.nownumber !== null && typeof unit.nownumber !== 'undefined' && Number(unit.nownumber) === 0;
        var state = controller.deathFade;
        var i;

        if (!dead || resurrecting) {
            if (state.wasDead || state.alpha < 1 || state.startedAt !== null) {
                for (i = 0; i < controller.items.length; i++) {
                    if (controller.items[i].binding.hideAfterDead) resetPlayback(controller.items[i]);
                }
            }
            state.startedAt = null;
            state.alpha = 1;
        } else if (doing) {
            // Keep the effect throughout the death animation, including queued final frames.
            state.startedAt = null;
            state.alpha = 1;
        } else if (!state.initialized) {
            // A corpse first loaded on the field must not briefly show its old effect.
            state.alpha = 0;
            state.startedAt = now - 400;
        } else {
            if (state.startedAt === null) state.startedAt = now;
            state.alpha = Math.max(0, 1 - (now - state.startedAt) / 400);
        }
        state.wasDead = dead && !resurrecting;
        state.initialized = true;
        return state.alpha;
    }

    function tickController(controller, now) {
        var rootAlpha;
        var aboveAlpha;
        var belowAlpha;
        var frame;
        var item;
        var partState;
        var matrix;
        var desiredAlpha;
        var deathAlpha;
        var shadowDeathVisible;
        var animationEvent;
        var previousFadeAlpha;
        var shadowAnimationChanged = false;
        var hierarchy;
        var rootMatrix;
        var autoParent;
        var belowPart;
        var previousPartBelowActive;
        var visible;
        var dirty = !!controller.pendingDraw;
        var i;

        if (controller.destroyed || !controller.unit || !controller.rootNode) return;
        previousPartBelowActive = controller.partBelowActive;
        syncPartBelowCache(controller, !controller.unit.doing && !controller.unit.active, false);
        if (controller.partBelowActive) controller.partBelowRestorePending = false;
        else if ((previousPartBelowActive || controller.partBelowRestorePending) && typeof controller.unit.show_obj === 'function') {
            controller.partBelowRestorePending = false;
            controller.unit.show_obj();
        }
        dirty = !!controller.pendingDraw || dirty;
        controller.pendingDraw = false;
        now = isFiniteNumber(now) ? now : clockNow();
        shadowDeathVisible = controller.deathFade.alpha > 0;
        deathAlpha = deathFadeAlpha(controller, now);
        animationEvent = unitAnimationFadeEvent(controller);
        hierarchy = unitRootHierarchy(controller.unit);
        visible = !!hierarchy && controller.unit.mvisible !== false && nodeVisible(controller.unit.mobject);
        if (hierarchy) {
            rootMatrix = hierarchy.nodes.length > 1 || controller.unit.mobject.matrix ? unitRootMatrix(hierarchy) : null;
            dirty = syncRootOrder(controller, controller.rootNode, hierarchy, false) || dirty;
            dirty = syncRootTransform(controller.rootNode, controller.unit.mobject, rootMatrix) || dirty;
            if (controller.belowRootNode) {
                dirty = syncRootOrder(controller, controller.belowRootNode, hierarchy, true) || dirty;
                dirty = syncRootTransform(controller.belowRootNode, controller.unit.mobject, rootMatrix) || dirty;
            }
        }
        dirty = setNodeVisible(controller.rootNode, visible) || dirty;
        // Both roots have unit.layer as their parent, including immediately after reparenting.
        aboveAlpha = hierarchy ? (controller.partBelowActive ? shadowNodeAlpha(controller.unit.layer) : nodeAbsoluteAlpha(controller.unit.layer)) : 0;
        if (controller.belowRootNode) {
            dirty = setNodeVisible(controller.belowRootNode, visible) || dirty;
            belowAlpha = aboveAlpha;
        }

        for (i = 0; i < controller.items.length; i++) {
            item = controller.items[i];
            previousFadeAlpha = item.animationFadeAlpha;
            item.animationFadeAlpha = updateAnimationFade(item.animationFadeState, item.binding.animationFade, animationEvent, now);
            if (previousFadeAlpha !== item.animationFadeAlpha && (item.animationFadeAlpha === 0 || item.animationFadeAlpha === 1)) shadowAnimationChanged = true;
            item.shadowLiftVisible = false;
            item.shadowLiftAlpha = 0;
            if (!item.binding.enabled) {
                if (item.sprite) dirty = setNodeVisible(item.sprite, false) || dirty;
                continue;
            }
            if (item.binding.hideAfterDead && deathAlpha <= 0) {
                if (item.sprite) {
                    dirty = setNodeAlpha(item.sprite, 0) || dirty;
                    dirty = setNodeVisible(item.sprite, false) || dirty;
                }
                continue;
            }
            if (!item.sprite && item.running) item.startedAt = now;
            if (item.sprite && item.spriteJustReady) {
                if (item.running) item.startedAt = now;
            }
            frame = itemPlaybackFrame(item, controller.unit, now);
            if (item.sprite) item.spriteJustReady = false;
            if (!item.sprite) {
                if (item.running) item.startedAt = now;
                continue;
            }
            rootAlpha = item.binding.layer === 'below' || item.binding.layer === 'part-below' ? belowAlpha : aboveAlpha;
            partState = getUnitPartStateById(controller.unit, getCachedItemPartId(item, controller.unit));
            autoParent = null;
            belowPart = null;
            if (controller.partBelowActive || item.binding.layer === 'part-below') {
                // Segment capture can leave stale child worldAlpha; use current ancestry for every affected binding.
                partState.visible = !!(partState.partId && partState.sprite && logicalPartTreeVisible(controller.unit, partState.partId) && shadowNodeVisible(partState.sprite));
                partState.alpha = partState.visible ? shadowNodeAlpha(partState.sprite) : 0;
            }
            if (item.binding.layer === 'part-below') {
                belowPart = visible ? partBelowParent(controller, partState) : null;
                dirty = moveAutoSprite(controller, item, belowPart ? belowPart.parent : controller.belowRootNode) || dirty;
                item.partBelowReference = belowPart ? belowPart.reference : null;
                if (belowPart) {
                    dirty = orderPartBelowSprite(controller, item, belowPart.reference, belowPart.parent, i) || dirty;
                    rootAlpha = shadowNodeAlpha(belowPart.parent);
                }
            }
            if (item.binding.layer === 'auto') {
                autoParent = visible ? autoPartParent(controller, partState) : null;
                dirty = moveAutoSprite(controller, item, autoParent ? autoParent.parent : controller.rootNode) || dirty;
                item.autoPartSprite = autoParent ? partState.sprite : null;
                if (autoParent) {
                    dirty = orderAutoSprite(controller, item, partState.sprite, autoParent.parent, i) || dirty;
                    rootAlpha = controller.partBelowActive ? shadowNodeAlpha(autoParent.parent) : nodeAbsoluteAlpha(autoParent.parent);
                }
            }
            if (frame < 0 || !partState.visible || partState.alpha <= 0 || rootAlpha <= 0) {
                dirty = setNodeVisible(item.sprite, false) || dirty;
                continue;
            }

            matrix = composeEffectMatrix(partState.matrix, item.binding);
            if (autoParent) matrix = multiplyMatrices(autoParent.matrix, matrix);
            if (belowPart) matrix = multiplyMatrices(belowPart.matrix, matrix);
            desiredAlpha = Math.max(0, Math.min(1, partState.alpha * item.binding.transform.alpha * (item.binding.hideAfterDead ? deathAlpha : 1) * item.animationFadeAlpha / rootAlpha));
            dirty = setAtlasFrame(item.sprite, item.effect, frame) || dirty;
            dirty = applyNodeMatrix(item.sprite, matrix) || dirty;
            dirty = setNodeAlpha(item.sprite, desiredAlpha) || dirty;
            dirty = setNodeVisible(item.sprite, desiredAlpha > 0) || dirty;
        }
        if (dirty && controller.partBelowActive) refreshPartBelowFilters(controller);
        // Fade endpoints invalidate the frozen silhouette once, never on intermediate opacity ticks.
        if ((shadowDeathVisible !== (deathAlpha > 0) || shadowAnimationChanged) && controller.unit.hwm_effect_shadow &&
                typeof root.hwm_unit_effect_shadow_changed === 'function') {
            root.hwm_unit_effect_shadow_changed(controller.unit);
            if (controller.pendingDraw && !controller.destroyed) {
                // Cache rebuilding lifts live effects; restore their placement before this frame is drawn.
                tickController(controller, now);
                return;
            }
        }
        if (dirty && controller.options.draw !== false) requestControllerDraw(controller);
    }

    function createUnitController(unit, rawCatalog, options) {
        var catalogResult = inspectCatalog(rawCatalog && rawCatalog.version === PACKED_SCHEMA_VERSION ?
            { version: CATALOG_VERSION, effects: rawCatalog.effects } : rawCatalog);
        var controller;

        if (!catalogResult.ok) throw new Error('Invalid animation-effect catalog.');
        if (!unit || !unit.layer || !unit.mobject) throw new Error('A rendered battle unit is required.');
        if (typeof root.Make_Sprite !== 'function' || typeof root.Make_addChild !== 'function' || typeof root.My_Image !== 'function') {
            throw new Error('The battle renderer is not initialized.');
        }

        controller = {
            unit: unit,
            catalog: catalogResult.catalog,
            document: { version: SCHEMA_VERSION, bindings: [] },
            options: options || {},
            rootNode: root.Make_Sprite(),
            belowRootNode: null,
            items: [],
            generation: 0,
            animationFrame: 0,
            deathFade: { initialized: false, wasDead: false, startedAt: null, alpha: 1 },
            pendingDraw: false,
            destroyed: false
        };
        controller.rootNode.hwm_anim_effects_layer = true;
        setNodeVisible(controller.rootNode, false);
        root.Make_addChild(unit.layer, controller.rootNode);

        controller.setDocument = function (rawDocument) {
            var result = inspectDocument(rawDocument, controller.catalog);

            if (!result.ok) return result;
            if (result.document.version === PACKED_SCHEMA_VERSION) {
                controller.catalog = { version: CATALOG_VERSION, effects: result.document.effects };
            }
            rebuildController(controller, result.document);
            return result;
        };
        controller.tick = function (now) { tickController(controller, now); };
        controller.restart = function () {
            var i;
            for (i = 0; i < controller.items.length; i++) resetPlayback(controller.items[i]);
        };
        controller.start = function () {
            function loop(timestamp) {
                if (controller.destroyed || !controller.animationFrame) return;
                tickController(controller, timestamp);
                controller.animationFrame = root.requestAnimationFrame(loop);
            }
            if (!controller.animationFrame && typeof root.requestAnimationFrame === 'function') {
                controller.animationFrame = root.requestAnimationFrame(loop);
            }
        };
        controller.stop = function () {
            if (controller.animationFrame && typeof root.cancelAnimationFrame === 'function') {
                root.cancelAnimationFrame(controller.animationFrame);
            }
            controller.animationFrame = 0;
        };
        controller.destroy = function () {
            if (controller.destroyed) return;
            controller.stop();
            controller.destroyed = true;
            controller.generation++;
            clearControllerItems(controller);
            syncAutoCacheHook(controller);
            if (controller.rootNode && typeof controller.rootNode.destroy === 'function') controller.rootNode.destroy();
            else if (controller.rootNode && typeof controller.rootNode.remove === 'function') controller.rootNode.remove();
            controller.rootNode = null;
            if (controller.belowRootNode && typeof controller.belowRootNode.destroy === 'function') controller.belowRootNode.destroy();
            else if (controller.belowRootNode && typeof controller.belowRootNode.remove === 'function') controller.belowRootNode.remove();
            controller.belowRootNode = null;
            if (unit.hwm_anim_effects_controller === controller && unit.hwm_effect_shadow &&
                    typeof root.hwm_unit_effect_shadow_changed === 'function') root.hwm_unit_effect_shadow_changed(unit);
            else if (controller.partBelowRestorePending && !unit.cleared && unit.inited_show !== false &&
                    unit.layer && !unit.layer.destroyed && !unit.layer._destroyed && typeof unit.show_obj === 'function') unit.show_obj();
            controller.partBelowRestorePending = false;
        };

        return controller;
    }

    var catalogPromises = {};
    var effectPromises = {};
    var documentPromises = {};
    var activeControllers = [];
    var managedUnits = [];

    function ensureTrailingSlash(value, fallback) {
        var base = trimmedString(value) || fallback;
        return base.charAt(base.length - 1) === '/' ? base : base + '/';
    }

    function isSafeConfigFilename(value) {
        return /^[A-Za-z0-9_-]+$/.test(trimmedString(value));
    }

    function requestJson(url, label) {
        return assetTimeout(requestJsonRequest(url, label), label);
    }

    function requestJsonRequest(url, label) {
        if (typeof root.fetch === 'function') {
            return root.fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(function (response) {
                if (!response.ok) throw new Error('Cannot load ' + label + ' (HTTP ' + response.status + ').');
                return response.json();
            });
        }
        if (typeof root.XMLHttpRequest === 'function') {
            return new Promise(function (resolve, reject) {
                var request = new root.XMLHttpRequest();

                request.open('GET', url, true);
                request.onreadystatechange = function () {
                    var raw;
                    if (request.readyState !== 4) return;
                    if ((request.status < 200 || request.status >= 300) && request.status !== 304) {
                        reject(new Error('Cannot load ' + label + ' (HTTP ' + request.status + ').'));
                        return;
                    }
                    try {
                        raw = JSON.parse(request.responseText);
                    } catch (error) {
                        reject(new Error('Cannot parse ' + label + '.'));
                        return;
                    }
                    resolve(raw);
                };
                request.onerror = function () { reject(new Error('Cannot load ' + label + '.')); };
                request.send(null);
            });
        }
        return Promise.reject(new Error('No JSON request API is available.'));
    }

    function cachedRequest(cache, key, loader) {
        var tracked;

        if (cache[key]) return cache[key];
        tracked = loader().then(function (value) {
            return value;
        }, function (error) {
            if (cache[key] === tracked) delete cache[key];
            throw error;
        });
        cache[key] = tracked;
        return tracked;
    }

    function loadCatalog(url) {
        var catalogUrl = url || (DEFAULT_ATLAS_BASE + 'catalog.json');

        return cachedRequest(catalogPromises, catalogUrl, function () {
            return requestJson(catalogUrl, 'animation-effect catalog').then(function (rawCatalog) {
                var result = inspectCatalog(rawCatalog);

                if (!result.ok) throw new Error('The animation-effect catalog is invalid.');
                return result.catalog;
            });
        });
    }

    function loadEffect(effectId, options) {
        var id = trimmedString(effectId);
        var opts = options || {};
        var atlasBase;
        var effectUrl;

        if (!isSafeConfigFilename(id)) return Promise.reject(new Error('The animation-effect id is unsafe.'));
        atlasBase = ensureTrailingSlash(opts.atlasBase, DEFAULT_ATLAS_BASE);
        effectUrl = assetUrl(atlasBase + encodeURIComponent(id) + '.json', opts.version);
        return cachedRequest(effectPromises, effectUrl, function () {
            return requestJson(effectUrl, 'animation-effect description').then(function (rawEffect) {
                var result = inspectCatalog({ version: CATALOG_VERSION, effects: [rawEffect] });

                if (!result.ok || result.catalog.effects[0].id !== id) {
                    throw new Error('The animation-effect description is invalid: ' + id + '.');
                }
                return result.catalog.effects[0];
            });
        });
    }

    function loadEffectResources(effectId, options) {
        var opts = options || {};
        var atlasBase = ensureTrailingSlash(opts.atlasBase, DEFAULT_ATLAS_BASE);
        var version = opts.version;
        return loadEffect(effectId, { atlasBase: atlasBase, version: version }).then(function (effect) {
            var url = assetUrl(atlasBase + effect.image, version);
            return loadAtlasImage(url).then(function (image) {
                validateAtlasImage(effect, image, url);
                return { effect: effect, image: image };
            });
        });
    }

    function loadDocument(filename, options) {
        var safeFilename = trimmedString(filename);
        var opts = options || {};
        var configBase;
        var documentUrl;

        if (!isSafeConfigFilename(safeFilename)) return Promise.reject(new Error('The animation-effect filename is unsafe.'));
        configBase = ensureTrailingSlash(opts.configBase, DEFAULT_CONFIG_BASE);
        documentUrl = assetUrl(configBase + encodeURIComponent(safeFilename) + '.json', opts.version);
        return cachedRequest(documentPromises, documentUrl, function () {
            return requestJson(documentUrl, 'animation-effect configuration');
        });
    }

    function unitConfigFilename(unit) {
        if (!unit) return '';
        return trimmedString(unit.anim_effects_filename || unit.filename || unit.lname);
    }

    function unitMetadata(unit) {
        var keys;
        var metadata;
        var i;
        if (!unit) return null;
        // A rendered unit keeps the metadata for its own image quality, even if another alias is loaded later.
        if (unit.inited_image && unit.razmetka && typeof unit.razmetka === 'object') return unit.razmetka;
        keys = [unit.hwm_animation_load && unit.hwm_animation_load.target_key, unit.filename,
            unit.anim_effects_filename, unit.lname];
        if (root.razmetka && typeof root.razmetka === 'object') {
            for (i = 0; i < keys.length; i++) {
                metadata = keys[i] && root.razmetka[keys[i]];
                if (metadata && typeof metadata === 'object') return metadata;
            }
        }
        return unit.razmetka && typeof unit.razmetka === 'object' ? unit.razmetka : null;
    }

    function hasEmbeddedUnitEffects(unit) {
        var metadata = unitMetadata(unit);
        return !!metadata && Object.prototype.hasOwnProperty.call(metadata, 'animEffects');
    }

    function getEmbeddedUnitEffects(unit) {
        var metadata = unitMetadata(unit);
        return metadata && Object.prototype.hasOwnProperty.call(metadata, 'animEffects') ? metadata.animEffects : undefined;
    }

    function hasUnitEffects(unit) {
        return !!unit && (hasEmbeddedUnitEffects(unit) || Number(unit.effects || 0) === 1);
    }

    function embeddedDocumentKey(documentValue) {
        if (documentValue && typeof documentValue === 'object') {
            if (!embeddedDocumentIds.has(documentValue)) embeddedDocumentIds.set(documentValue, ++nextEmbeddedDocumentId);
            return String(embeddedDocumentIds.get(documentValue));
        }
        return typeof documentValue + ':' + String(documentValue);
    }

    function unitIsRendered(unit) {
        if (!unit || !unit.layer || !unit.mobject || unit.inited_show === false) return false;
        if (unit.layer.destroyed || unit.layer._destroyed || unit.mobject.destroyed || unit.mobject._destroyed) return false;
        return true;
    }

    function removeActiveController(controller) {
        var i;

        for (i = activeControllers.length - 1; i >= 0; i--) {
            if (activeControllers[i] === controller) activeControllers.splice(i, 1);
        }
    }

    function addManagedUnit(unit) {
        var i;

        for (i = 0; i < managedUnits.length; i++) {
            if (managedUnits[i] === unit) return;
        }
        managedUnits.push(unit);
    }

    function removeManagedUnit(unit) {
        var i;

        for (i = managedUnits.length - 1; i >= 0; i--) {
            if (managedUnits[i] === unit) managedUnits.splice(i, 1);
        }
    }

    function detachUnit(unit) {
        var controller;

        if (!unit) return;
        unit.hwm_anim_effects_generation = Number(unit.hwm_anim_effects_generation || 0) + 1;
        unit.hwm_anim_effects_pending = null;
        unit.hwm_anim_effects_pending_key = '';
        unit.hwm_anim_effects_failed_key = '';
        unit.hwm_anim_effects_prepare_generation = Number(unit.hwm_anim_effects_prepare_generation || 0) + 1;
        unit.hwm_anim_effects_prepared = null;
        unit.hwm_anim_effects_prepare_pending = null;
        unit.hwm_anim_effects_prepare_key = '';
        unit.hwm_anim_effects_prepare_error = null;
        controller = unit.hwm_anim_effects_controller;
        if (controller) {
            removeActiveController(controller);
            controller.destroy();
        }
        unit.hwm_anim_effects_controller = null;
        unit.hwm_anim_effects_controller_key = '';
        removeManagedUnit(unit);
    }

    function defaultRuntimeError(error) {
        if (root.console && typeof root.console.warn === 'function') root.console.warn('Animation effect:', error);
    }

    function discardFailedController(controller, unit, error) {
        var errorHandler = controller && controller.options && typeof controller.options.onError === 'function' ?
            controller.options.onError : defaultRuntimeError;

        try {
            errorHandler(error);
        } catch (reportError) {
            defaultRuntimeError(error);
            defaultRuntimeError(reportError);
        }
        removeActiveController(controller);
        try {
            if (unit && unit.hwm_anim_effects_controller === controller) detachUnit(unit);
            else if (controller && !controller.destroyed) controller.destroy();
        } catch (destroyError) {
            defaultRuntimeError(destroyError);
            if (unit && unit.hwm_anim_effects_controller === controller) {
                unit.hwm_anim_effects_controller = null;
                unit.hwm_anim_effects_controller_key = '';
                removeManagedUnit(unit);
            }
        }
    }

    function unitAssetSettings(unit, options) {
        var opts = options || {};
        var version = opts.version;
        var filename = unitConfigFilename(unit);
        var configBase = ensureTrailingSlash(opts.configBase, DEFAULT_CONFIG_BASE);
        var atlasBase = ensureTrailingSlash(opts.atlasBase, DEFAULT_ATLAS_BASE);
        var embedded = hasEmbeddedUnitEffects(unit);
        var documentValue = embedded ? getEmbeddedUnitEffects(unit) : null;
        if (version === null || typeof version === 'undefined') version = unit.load_ver;
        if (version === null || typeof version === 'undefined') version = unit.version;
        return {
            filename: filename,
            configBase: configBase,
            atlasBase: atlasBase,
            embedded: embedded,
            embeddedDocument: documentValue,
            version: version,
            key: assetUrl(configBase + encodeURIComponent(filename) + '.json', version) + '|' + atlasBase +
                (embedded ? '|embedded:' + embeddedDocumentKey(documentValue) : '')
        };
    }

    function getUnitEffectsKey(unit, options) {
        return unit ? unitAssetSettings(unit, options).key : '';
    }

    function unitAssetsCurrent(unit, options, settings) {
        return hasUnitEffects(unit) && unitAssetSettings(unit, options).key === settings.key &&
            !(unit.layer && (unit.layer.destroyed || unit.layer._destroyed)) &&
            !(unit.mobject && (unit.mobject.destroyed || unit.mobject._destroyed));
    }

    function loadUnitDescriptions(settings, current) {
        if (settings.embedded) {
            return Promise.resolve().then(function () {
                var result;
                if (!current()) return null;
                result = inspectDocument(settings.embeddedDocument);
                if (!result.ok || result.document.version !== PACKED_SCHEMA_VERSION) {
                    throw new Error('The embedded animation-effect configuration is invalid.');
                }
                return { key: settings.key, embedded: true,
                    catalog: { version: CATALOG_VERSION, effects: result.document.effects }, document: result.document };
            });
        }
        return loadDocument(settings.filename, settings).then(function (rawDocument) {
            var result;
            var requests = [];
            var seen = {};
            var id;
            var i;
            if (!current()) return null;
            result = inspectDocument(rawDocument);
            if (!result.ok) throw new Error('The animation-effect configuration is invalid.');
            if (result.document.version === PACKED_SCHEMA_VERSION) {
                for (i = 0; i < result.document.effects.length; i++) {
                    if (result.document.effects[i].image !== settings.filename + '.png') {
                        throw new Error('The combined animation-effect image must match its unit filename.');
                    }
                }
                return { key: settings.key, catalog: { version: CATALOG_VERSION, effects: result.document.effects }, document: result.document };
            }
            // Battle units request only the descriptions referenced by their bindings.
            for (i = 0; i < result.document.bindings.length; i++) {
                id = result.document.bindings[i].effectId;
                if (seen['$' + id]) continue;
                seen['$' + id] = true;
                requests.push(loadEffect(id, settings));
            }
            return Promise.all(requests).then(function (effects) {
                var catalog = { version: CATALOG_VERSION, effects: effects };
                var validated;
                if (!current()) return null;
                validated = inspectDocument(result.document, catalog);
                if (!validated.ok) throw new Error('The animation-effect configuration is invalid.');
                return { key: settings.key, catalog: catalog, document: validated.document };
            });
        });
    }

    function isUnitPrepared(unit, options) {
        if (!hasUnitEffects(unit)) return true;
        return !!unit.hwm_anim_effects_prepared &&
            unitAssetsCurrent(unit, options, { key: unit.hwm_anim_effects_prepared.key });
    }

    function prepareUnit(unit, options) {
        var opts = options || {};
        var settings;
        var generation;
        var tracked;
        function current() {
            return unit.hwm_anim_effects_prepare_generation === generation && unitAssetsCurrent(unit, opts, settings);
        }
        if (!unit) return Promise.resolve(null);
        if (!hasUnitEffects(unit)) {
            detachUnit(unit);
            return Promise.resolve(null);
        }
        settings = unitAssetSettings(unit, opts);
        if (!settings.embedded && !isSafeConfigFilename(settings.filename)) {
            detachUnit(unit);
            return Promise.reject(new Error('The animation-effect filename is unsafe.'));
        }
        if (isUnitPrepared(unit, opts)) return Promise.resolve(unit.hwm_anim_effects_prepared);
        if (unit.hwm_anim_effects_prepare_key === settings.key) {
            if (unit.hwm_anim_effects_prepare_pending) return unit.hwm_anim_effects_prepare_pending;
            if (unit.hwm_anim_effects_prepare_error) return Promise.reject(unit.hwm_anim_effects_prepare_error);
        }
        detachUnit(unit);
        generation = unit.hwm_anim_effects_prepare_generation;
        unit.hwm_anim_effects_prepare_key = settings.key;
        addManagedUnit(unit);
        tracked = loadUnitDescriptions(settings, current).then(function (loaded) {
            var requests = [];
            var i;
            if (!loaded || !current()) return null;
            for (i = 0; i < loaded.catalog.effects.length; i++) {
                (function (effect) {
                    var packed = loaded.document.version === PACKED_SCHEMA_VERSION;
                    var base = packed && !loaded.embedded ? settings.configBase : settings.atlasBase;
                    var url = assetUrl(base + effect.image, settings.version);
                    requests.push(loadAtlasImage(url).then(function (image) {
                        if (packed || typeof effect.atlasWidth === 'number') validateAtlasImage(effect, image, url);
                        return image;
                    }));
                }(loaded.catalog.effects[i]));
            }
            return Promise.all(requests).then(function () {
                return current() ? loaded : null;
            });
        }).then(function (loaded) {
            if (unit.hwm_anim_effects_prepare_generation === generation) unit.hwm_anim_effects_prepare_pending = null;
            if (current()) unit.hwm_anim_effects_prepared = loaded;
            return loaded;
        }, function (error) {
            if (unit.hwm_anim_effects_prepare_generation === generation) unit.hwm_anim_effects_prepare_pending = null;
            if (!current()) return null;
            unit.hwm_anim_effects_prepare_pending = null;
            unit.hwm_anim_effects_prepare_error = error;
            throw error;
        });
        unit.hwm_anim_effects_prepare_pending = tracked;
        return tracked;
    }

    function attachLoadedController(unit, loaded, settings, options, initialize) {
        var opts = options || {};
        var controller = createUnitController(unit, loaded.catalog, {
            atlasBase: settings.atlasBase,
            configBase: settings.configBase,
            embedded: !!loaded.embedded,
            version: settings.version,
            draw: typeof opts.draw === 'boolean' ? opts.draw : false,
            random: opts.random,
            onError: typeof opts.onError === 'function' ? opts.onError : defaultRuntimeError
        });
        var result;
        try {
            result = controller.setDocument(loaded.document);
            if (!result.ok) throw new Error('The animation-effect configuration is invalid.');
            if (initialize) controller.tick(clockNow());
        } catch (error) {
            controller.destroy();
            throw error;
        }
        unit.hwm_anim_effects_controller = controller;
        unit.hwm_anim_effects_controller_key = settings.key;
        activeControllers.push(controller);
        addManagedUnit(unit);
        return controller;
    }

    function syncUnit(unit, options) {
        var opts = options || {};
        var settings;
        var generation;
        var prepared;
        var request;
        var tracked;
        function current() {
            return unit.hwm_anim_effects_generation === generation && unitIsRendered(unit) && unitAssetsCurrent(unit, opts, settings);
        }
        if (!unit) return Promise.resolve(null);
        if (!hasUnitEffects(unit)) {
            detachUnit(unit);
            return Promise.resolve(null);
        }
        if (!unitIsRendered(unit)) return Promise.resolve(null);
        settings = unitAssetSettings(unit, opts);
        if (!settings.embedded && !isSafeConfigFilename(settings.filename)) {
            detachUnit(unit);
            return Promise.reject(new Error('The animation-effect filename is unsafe.'));
        }
        if (unit.hwm_anim_effects_controller && !unit.hwm_anim_effects_controller.destroyed &&
                unit.hwm_anim_effects_controller_key === settings.key) {
            return Promise.resolve(unit.hwm_anim_effects_controller);
        }
        if (isUnitPrepared(unit, opts)) {
            prepared = unit.hwm_anim_effects_prepared;
            if (unit.hwm_anim_effects_controller || unit.hwm_anim_effects_pending) detachUnit(unit);
            unit.hwm_anim_effects_prepared = prepared;
            try {
                return Promise.resolve(attachLoadedController(unit, prepared, settings, opts, true));
            } catch (error) {
                return Promise.reject(error);
            }
        }
        if (unit.hwm_anim_effects_pending && unit.hwm_anim_effects_pending_key === settings.key) {
            return unit.hwm_anim_effects_pending;
        }
        if (unit.hwm_anim_effects_failed_key === settings.key) return Promise.resolve(null);
        if (unit.hwm_anim_effects_controller || unit.hwm_anim_effects_pending) detachUnit(unit);
        generation = Number(unit.hwm_anim_effects_generation || 0) + 1;
        unit.hwm_anim_effects_generation = generation;
        unit.hwm_anim_effects_pending_key = settings.key;
        addManagedUnit(unit);
        request = loadUnitDescriptions(settings, current).then(function (loaded) {
            if (!loaded || !current()) return null;
            return attachLoadedController(unit, loaded, settings, opts, false);
        });
        tracked = request.then(function (controller) {
            if (unit.hwm_anim_effects_generation === generation) {
                unit.hwm_anim_effects_pending = null;
                unit.hwm_anim_effects_pending_key = '';
            }
            return controller;
        }, function (error) {
            if (unit.hwm_anim_effects_generation === generation) {
                unit.hwm_anim_effects_pending = null;
                unit.hwm_anim_effects_pending_key = '';
                unit.hwm_anim_effects_failed_key = settings.key;
            }
            throw error;
        });
        unit.hwm_anim_effects_pending = tracked;
        return tracked;
    }

    function tickAll(now) {
        var controller;
        var unit;
        var i;

        now = isFiniteNumber(now) ? now : clockNow();
        for (i = activeControllers.length - 1; i >= 0; i--) {
            controller = activeControllers[i];
            unit = controller && controller.unit;
            if (!controller || controller.destroyed) {
                activeControllers.splice(i, 1);
            } else if (!hasUnitEffects(unit) || !unitIsRendered(unit)) {
                if (unit) detachUnit(unit);
                else {
                    activeControllers.splice(i, 1);
                    controller.destroy();
                }
            } else {
                try {
                    controller.tick(now);
                } catch (error) {
                    discardFailedController(controller, unit, error);
                }
            }
        }
    }

    function destroyAll() {
        var units = managedUnits.slice();
        var controllers = activeControllers.slice();
        var controller;
        var i;

        for (i = 0; i < units.length; i++) detachUnit(units[i]);
        managedUnits = [];
        activeControllers = [];
        for (i = 0; i < controllers.length; i++) {
            controller = controllers[i];
            if (controller && controller.unit && controller.unit.hwm_anim_effects_controller === controller) {
                detachUnit(controller.unit);
            } else if (controller && !controller.destroyed) {
                controller.destroy();
            }
        }
    }

    if (root[API_NAME]) {
        if (root[API_NAME].apiVersion !== API_VERSION ||
                root[API_NAME].schemaVersion !== SCHEMA_VERSION ||
                typeof root[API_NAME].prepareDocument !== 'function' ||
                typeof root[API_NAME].validateDocument !== 'function' ||
                typeof root[API_NAME].prepareCatalog !== 'function' ||
                typeof root[API_NAME].createUnitController !== 'function' ||
                typeof root[API_NAME].syncUnit !== 'function' ||
                typeof root[API_NAME].detachUnit !== 'function' ||
                typeof root[API_NAME].tickAll !== 'function') {
            throw new Error(API_NAME + ' is already defined with an incompatible API.');
        }
        if (typeof module !== 'undefined' && module.exports) module.exports = root[API_NAME];
        return;
    }

    root[API_NAME] = {
        apiVersion: API_VERSION,
        schemaVersion: SCHEMA_VERSION,
        packedSchemaVersion: PACKED_SCHEMA_VERSION,
        catalogVersion: CATALOG_VERSION,
        maxBindings: MAX_BINDINGS,
        selectorTypes: {
            STAND: SELECTOR_TYPES.STAND,
            ALWAYS: SELECTOR_TYPES.ALWAYS,
            ANIMATION: SELECTOR_TYPES.ANIMATION
        },
        triggerTypes: {
            FRAME: TRIGGER_TYPES.FRAME,
            RANGE: TRIGGER_TYPES.RANGE
        },
        playModes: {
            ONCE: PLAY_MODES.ONCE,
            DURATION: PLAY_MODES.DURATION,
            LOOP: PLAY_MODES.LOOP
        },
        prepareCatalog: prepareCatalog,
        getCatalogEffect: getCatalogEffect,
        prepareDocument: prepareDocument,
        validateDocument: validateDocument,
        buildPartPath: buildPartPath,
        getPartId: getPartId,
        captureUnitShadow: captureUnitShadow,
        animationFade: { normalize: inspectAnimationFade, createState: createAnimationFadeState, update: updateAnimationFade },
        syncUnitPartBelowCache: syncUnitPartBelowCache,
        restoreUnitPartBelowCache: restoreUnitPartBelowCache,
        getUnitPartState: getUnitPartState,
        listUnitParts: listUnitParts,
        loadCatalog: loadCatalog,
        loadEffect: loadEffect,
        loadEffectResources: loadEffectResources,
        loadDocument: loadDocument,
        createUnitController: createUnitController,
        prepareUnit: prepareUnit,
        isUnitPrepared: isUnitPrepared,
        hasUnitEffects: hasUnitEffects,
        hasEmbeddedUnitEffects: hasEmbeddedUnitEffects,
        getEmbeddedUnitEffects: getEmbeddedUnitEffects,
        getUnitEffectsKey: getUnitEffectsKey,
        attachUnit: syncUnit,
        syncUnit: syncUnit,
        detachUnit: detachUnit,
        tickAll: tickAll,
        destroyAll: destroyAll,
        matrix: {
            toArray: matrixArray,
            multiply: multiplyMatrices,
            invert: invertMatrix,
            transformPoint: transformPoint,
            composeEffect: composeEffectMatrix
        }
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = root[API_NAME];
}(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));

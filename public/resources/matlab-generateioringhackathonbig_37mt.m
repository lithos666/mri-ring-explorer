clear; 
%clc; 
%close all;
tic;

%% Test GenerateIORingPairFromQuadrant using BIGBLACK_IOring_MagnetOnly
% as the starting geometry.

Fov_half = 75;
%Fov_half = 10;


FOV_half_1 = Fov_half;
FOV_1 = -FOV_half_1:1:FOV_half_1;
FOV_half_2 = Fov_half;
FOV_2 = -FOV_half_2:1:FOV_half_2;
FOV_3 = 0;
slice_offsets_mm = [-2, -1, 0, 1, 2];
surface = 'z';
n_per_group = 1;
force_surface_divisions = 10;
font_size = 18;

% Peak-to-peak-homogeneity optimized BIGBLACK inputs.
% Verified from the element-wise average of five 1 mm-spaced 2-D slices at
% Z = [-2, -1, 0, 1, 2] mm over the circular 1 mm x-y grid.
% mean Bz = 37.357557 mT, peak-to-peak = 168.646099 ppm.
n_bar = 28;
bar_pitch_deg = 360 / n_bar;
array_rotation_deg = bar_pitch_deg / 2;


% The same row number across these four arrays describes one seed magnet.
%   quadrant_loc   : [R, Z] in mm
%   quadrant_dim   : local [dim_x, dim_y, dim_z] in mm
%   quadrant_angle : magnetization angle in the R-Z plane, in degrees
%   quadrant_Br    : remanence in T
%
% Optimized upper seeds use -R (0 deg), +R (180 deg), or -Z (270 deg). All
% radial center coordinates are whole millimetres. Differently polarized
% quadrant magnets have at least 10 mm edge-to-edge clearance (verified
% minimum: 10 mm). Equally polarized parallel-stack magnets have at least
% 6 mm clearance (verified minimum: 6 mm); series stacks may touch.
% GenerateIORingPairFromQuadrant creates each complete upper ring and its
% IOring-symmetric lower ring automatically.

% radial, Z
quadrant_loc = [ ...
    185, 247; ...
    164, 247; ...
    152, 247; ...
    140, 247; ...
    128, 247; ...
    186, 209; ...
    174, 209; ...
    162, 209; ...
    150, 209; ...
    138, 209; ...
    126, 209; ...
    186, 171; ...
    174, 171; ...
    162, 171; ...
    150, 171; ...
    138, 171; ...
    186, 133; ...
    174, 133; ...
    162, 133; ...
    150, 133; ...
    138, 133; ...
    126, 133; ...
    175,  95; ...
    150,  95; ...
    127,  95; ...
    186,  57; ...
    156,  57; ...
    132,  57; ...
    186,  19; ...
    162,  19; ...
    127,  19];

quadrant_angle = [ ...
    180 * ones(22, 1); ...
    0; ...
    270 * ones(3, 1); ...
    180; ...
    270 * ones(2, 1); ...
    180; ...
    270];



quadrant_dim = repmat([12, 12, 12], size(quadrant_loc, 1), 1);
quadrant_Br = 1.43 * ones(size(quadrant_loc, 1), 1);

[loc_all_list, angle_all, magnet_dim_all, Br_all] = ...
    GenerateIORingPairFromQuadrant( ...
    n_bar, quadrant_loc, quadrant_dim, quadrant_angle, quadrant_Br);

% Rotate the complete array by half a bar pitch. This places the x = 0 and
% y = 0 axes midway between neighboring magnet groups. Rotate each cuboid's
% azimuth by the same amount so the magnetic geometry changes only by a
% rigid rotation about Z.
rotation_xy = [cosd(array_rotation_deg), -sind(array_rotation_deg); ...
               sind(array_rotation_deg),  cosd(array_rotation_deg)];
loc_all_list(:, 1:2) = loc_all_list(:, 1:2) * rotation_xy.';
angle_all(:, 1) = mod(angle_all(:, 1) + array_rotation_deg, 360);

% Basic geometry checks
n_expected = n_bar * sum(1 + (quadrant_loc(:, 2) > 1e-9));
assert(size(loc_all_list, 1) == n_expected, ...
    'Expected %d magnets, but generated %d.', n_expected, size(loc_all_list, 1));
assert(isequal(size(angle_all), [n_expected, 3]), 'Unexpected angle_all size.');
assert(isequal(size(magnet_dim_all), [n_expected, 3]), ...
    'Unexpected magnet_dim_all size.');
assert(isequal(size(Br_all), [1, n_expected]), 'Unexpected Br_all size.');

generated_radius = hypot(loc_all_list(:, 1), loc_all_list(:, 2));
for layer_index = 1:size(quadrant_loc, 1)
    layer_radius = quadrant_loc(layer_index, 1);
    layer_z = quadrant_loc(layer_index, 2);
    layer_mask = abs(generated_radius - layer_radius) < 1e-9;

    assert(sum(layer_mask & abs(loc_all_list(:, 3) - layer_z) < 1e-9) == n_bar, ...
        'Upper ring %d does not contain n_bar magnets.', layer_index);
    if layer_z > 1e-9
        assert(sum(layer_mask & abs(loc_all_list(:, 3) + layer_z) < 1e-9) == n_bar, ...
            'Lower ring %d does not contain n_bar magnets.', layer_index);
    end
end
assert(all(Br_all >= 0), 'Generated remanence values must be nonnegative.');

% Verify that every Cartesian axis bisects two adjacent magnet groups.
axis_angles_deg = [0, 90, 180, 270];
generated_angles_deg = mod(atan2d(loc_all_list(:, 2), loc_all_list(:, 1)), 360);
for axis_index = 1:numel(axis_angles_deg)
    angular_distance = abs(mod(generated_angles_deg - ...
        axis_angles_deg(axis_index) + 180, 360) - 180);
    assert(abs(min(angular_distance) - array_rotation_deg) < 1e-9, ...
        'A Cartesian axis does not bisect adjacent magnet groups.');
end

fprintf('Geometry checks passed.\n');
fprintf('Array rotation              : %.9f degrees\n', array_rotation_deg);
fprintf('Quadrant seed magnets       : %d\n', size(quadrant_loc, 1));
fprintf('Total generated magnets     : %d\n', size(loc_all_list, 1));

% Create the MagTetris object, calculate five planes around the center, and
% average corresponding pixels before computing field strength/homogeneity.
IOring_MT = MagTetris().AssignCuboid( ...
    loc_all_list, angle_all, Br_all, magnet_dim_all);
%print_max_total_layer_force(IOring_MT, force_surface_divisions);
[Bx, By, Bz, Bx_slices, By_slices, Bz_slices] = averaged_field2d( ...
    IOring_MT, FOV_1, FOV_2, slice_offsets_mm, n_per_group);

% Keep only the circular FoV.
[FOV_x, FOV_y] = meshgrid(FOV_1, FOV_2);
outside_FOV = hypot(FOV_x, FOV_y) > FOV_half_1;
Bx(outside_FOV) = NaN;
By(outside_FOV) = NaN;
Bz(outside_FOV) = NaN;

Bx = Bx * 1e3;
By = By * 1e3;
Bz = Bz * 1e3;
Bx_slices = mask_and_scale_field_stack(Bx_slices, outside_FOV, 1e3);
By_slices = mask_and_scale_field_stack(By_slices, outside_FOV, 1e3);
Bz_slices = mask_and_scale_field_stack(Bz_slices, outside_FOV, 1e3);

metrics = calc_B0_homogeneity(Bz);
fprintf('Averaged slice Z values     : %s mm\n', mat2str(slice_offsets_mm));
fprintf('Mean Bz                     : %.6f mT\n', metrics.Bmean);
fprintf('Max Bz                     : %.6f mT\n', metrics.Bmax);
fprintf('Min Bz                     : %.6f mT\n', metrics.Bmin);
fprintf('Peak-to-peak homogeneity    : %.6f ppm\n', metrics.hom_ppm_pp);
fprintf('Standard-deviation homogeneity: %.6f ppm\n\n', metrics.hom_ppm_std);

% Plot the five-slice averaged field.
figure(2);
%figure('Color', 'w', 'Name', 'Quadrant-generated IOring Bz');
pcolor(FOV_1, FOV_2, Bz);
axis equal tight;
shading flat;
cb = colorbar;
set(get(cb, 'Title'), 'String', 'mT');
colormap jet;
set(gca, 'FontSize', font_size);
xlabel('x / mm');
ylabel('y / mm');
title(sprintf('Five-slice average B_z: %.3f ppm, mean %.3f mT', ...
    metrics.hom_ppm_pp, metrics.Bmean));

% Draw the complete generated magnet array
DrawMagnetization(loc_all_list, angle_all, magnet_dim_all, ...
    FOV_1, FOV_2, FOV_3, surface, Bz);
toc;

function print_max_total_layer_force(mt, surface_divisions)
% Print the largest total force on a complete Z-position layer.
% A layer contains every magnet whose center has the same Z coordinate,
% including magnets belonging to different concentric rings. For each
% target layer, the sources are every magnet in all the other Z layers.
% ForceSingle only reads the MagTetris object, so this calculation does not
% change any magnet location, orientation, dimension, or remanence value.
    validateattributes(surface_divisions, {'numeric'}, ...
        {'scalar', 'real', 'finite', 'integer', 'positive'}, ...
        mfilename, 'surface_divisions');

    z_mm = mt.cub_loc(:, 3);
    grouping_tolerance_mm = 1e-8;
    layer_z_mm = sort(unique(z_mm), 'descend');
    n_layer = numel(layer_z_mm);
    layer_indices = cell(n_layer, 1);

    for layer_index = 1:n_layer
        layer_indices{layer_index} = find( ...
            abs(z_mm - layer_z_mm(layer_index)) <= grouping_tolerance_mm);
    end

    if n_layer < 2
        error('At least two magnet Z-position layers are required.');
    end

    all_magnet_indices = (1:mt.cub_numMag).';
    fprintf('\nCalculating the total force on each of %d Z-position layers...\n', ...
        n_layer);

    max_force_magnitude_n = -Inf;
    max_force_vector_n = [NaN, NaN, NaN];
    max_target_layer = NaN;
    layer_force_magnitudes_n = zeros(n_layer, 1);

    for target_layer = 1:n_layer
        target_magnets = layer_indices{target_layer};
        target_index_list = [ones(numel(target_magnets), 1), ...
            target_magnets(:)];
        source_magnets = setdiff(all_magnet_indices, target_magnets);
        source_index_list = [ones(numel(source_magnets), 1), ...
            source_magnets(:)];

        layer_force_n = zeros(1, 3);
        for target_index = 1:size(target_index_list, 1)
            layer_force_n = layer_force_n + mt.ForceSingle( ...
                target_index_list(target_index, :), ...
                source_index_list, surface_divisions);
        end

        force_magnitude_n = norm(layer_force_n);
        layer_force_magnitudes_n(target_layer) = force_magnitude_n;
        if force_magnitude_n > max_force_magnitude_n
            max_force_magnitude_n = force_magnitude_n;
            max_force_vector_n = layer_force_n;
            max_target_layer = target_layer;
        end
    end

    average_force_magnitude_n = mean(layer_force_magnitudes_n);

    fprintf('\nTotal layer-force calculation\n');
    fprintf('Z-position layers           : %d\n', n_layer);
    fprintf('Target layers evaluated     : %d\n', n_layer);
    fprintf('Sources for each target     : all other Z-position layers\n');
    fprintf('Surface divisions per side  : %d\n', surface_divisions);
    fprintf('Maximum total force magnitude: %.6f N\n', max_force_magnitude_n);
    fprintf('Average total force magnitude: %.6f N\n', average_force_magnitude_n);
    fprintf('Force vector [Fx, Fy, Fz]   : [%.6f, %.6f, %.6f] N\n', ...
        max_force_vector_n);
    fprintf('Maximum-force layer         : layer %d\n', max_target_layer);
    fprintf('Layer %d                     : Z = %.6f mm, magnets = %d\n\n', ...
        max_target_layer, layer_z_mm(max_target_layer), ...
        numel(layer_indices{max_target_layer}));
end


function [Bx_average, By_average, Bz_average, ...
        Bx_slices, By_slices, Bz_slices] = averaged_field2d( ...
        mt, axis_1, axis_2, slice_offsets_mm, n_per_group)
% Calculate each parallel Z plane, then average corresponding x-y pixels.
% Units are unchanged from MagTetris.Field2D (tesla).
    n_slice = numel(slice_offsets_mm);
    assert(n_slice > 0, 'slice_offsets_mm cannot be empty.');
    [Bx_slice, By_slice, Bz_slice] = mt.Field2D( ...
        axis_1, axis_2, slice_offsets_mm(1), 'z', n_per_group);
    stack_size = [size(Bz_slice), n_slice];
    Bx_slices = zeros(stack_size);
    By_slices = zeros(stack_size);
    Bz_slices = zeros(stack_size);
    Bx_slices(:, :, 1) = Bx_slice;
    By_slices(:, :, 1) = By_slice;
    Bz_slices(:, :, 1) = Bz_slice;
    for slice_index = 2:n_slice
        [Bx_slices(:, :, slice_index), ...
            By_slices(:, :, slice_index), ...
            Bz_slices(:, :, slice_index)] = mt.Field2D( ...
            axis_1, axis_2, slice_offsets_mm(slice_index), 'z', ...
            n_per_group);
    end
    Bx_average = mean(Bx_slices, 3);
    By_average = mean(By_slices, 3);
    Bz_average = mean(Bz_slices, 3);
end


function scaled_stack = mask_and_scale_field_stack( ...
        field_stack, outside_mask, scale_factor)
    scaled_stack = scale_factor * field_stack;
    for slice_index = 1:size(scaled_stack, 3)
        slice = scaled_stack(:, :, slice_index);
        slice(outside_mask) = NaN;
        scaled_stack(:, :, slice_index) = slice;
    end
end


function metrics = calc_B0_homogeneity(Bmap, B0_ref)
    B = Bmap(isfinite(Bmap));
    if isempty(B)
        error('Bmap contains no valid finite values.');
    end

    if nargin < 2 || isempty(B0_ref)
        B0_ref = mean(B);
    end
    if B0_ref == 0
        error('B0_ref cannot be zero.');
    end

    metrics = struct();
    metrics.B0_ref = B0_ref;
    metrics.Bmax = max(B);
    metrics.Bmin = min(B);
    metrics.Bmean = mean(B);
    metrics.Bstd = std(B);
    metrics.deltaB_pp = metrics.Bmax - metrics.Bmin;
    metrics.hom_ppm_pp = metrics.deltaB_pp / abs(B0_ref) * 1e6;
    metrics.hom_ppm_std = metrics.Bstd / abs(B0_ref) * 1e6;
end


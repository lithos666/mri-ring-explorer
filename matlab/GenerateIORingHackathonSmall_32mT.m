clear; 
%clc; 
%close all;

%% Generate and evaluate the SMALL IOring reference geometry

Fov_half = 25;
%Fov_half = 10;
 

FOV_half_1 = Fov_half;
FOV_1 = -FOV_half_1:1:FOV_half_1;
FOV_half_2 = Fov_half;
FOV_2 = -FOV_half_2:1:FOV_half_2;
FOV_3 = 0;
slice_offsets_mm = [-2, -1, 0, 1, 2];
surface = 'z';
n_per_group = 1;
font_size = 18;

% Peak-to-peak-homogeneity optimized SMALL IOring inputs.
% Verified from the element-wise average of five 1 mm-spaced 2-D slices at
% Z = [-2, -1, 0, 1, 2] mm over the circular 1 mm x-y grid.
% mean Bz = 32.136821311 mT, peak-to-peak = 7.623891594 ppm.
n_bar = 14;


% The same row number across these four arrays describes one seed magnet.
%   quadrant_loc   : [R, Z] in mm
%   quadrant_dim   : local [dim_x, dim_y, dim_z] in mm
%   quadrant_angle : magnetization angle in the R-Z plane, in degrees
%   quadrant_Br    : remanence in T
%
% Upper seeds use +R (180 deg) or -Z (270 deg). All
% radial center coordinates are whole millimetres. Differently polarized
% quadrant magnets have at least 7 mm edge-to-edge clearance. Equally
% polarized parallel-stack magnets have at least 7 mm clearance; series
% stacks may touch. These constraints were independently validated by the
% optimizer before this geometry was saved.
% GenerateIORingPairFromQuadrant creates each complete upper ring and its
% IOring-symmetric lower ring automatically.

% radial, Z
quadrant_loc = [ ...
    125, 169; ...
    115, 169; ...
    105, 169; ...
     95, 169; ...
     85, 169; ...
    125, 143; ...
    115, 143; ...
    105, 143; ...
     95, 143; ...
     85, 143; ...
    125, 117; ...
    115, 117; ...
    105, 117; ...
     95, 117; ...
     85, 117; ...
    125,  91; ...
    105,  91; ...
     95,  91; ...
     85,  91; ...
    125,  65; ...
    105,  65; ...
     86,  65; ...
    112,  39; ...
     93,  39; ...
    125,  13; ...
    107,  13; ...
     85,  13];

quadrant_angle = [ ...
    180 * ones(15, 1); ...
    270; ...
    180 * ones(4, 1); ...
    270 * ones(7, 1)];



quadrant_dim = repmat([10, 10, 10], size(quadrant_loc, 1), 1);
quadrant_Br = 1.43 * ones(size(quadrant_loc, 1), 1);

[loc_all_list, angle_all, magnet_dim_all, Br_all] = ...
    GenerateIORingPairFromQuadrant( ...
    n_bar, quadrant_loc, quadrant_dim, quadrant_angle, quadrant_Br);

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

fprintf('Geometry checks passed.\n');
fprintf('Quadrant seed magnets       : %d\n', size(quadrant_loc, 1));
fprintf('Total generated magnets     : %d\n', size(loc_all_list, 1));

% Create the MagTetris object, calculate five planes around the center, and
% average corresponding pixels before computing field strength/homogeneity.
IOring_MT = MagTetris().AssignCuboid( ...
    loc_all_list, angle_all, Br_all, magnet_dim_all);
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
title("Bz");

% Draw the complete generated magnet array
DrawMagnetization(loc_all_list, angle_all, magnet_dim_all, ...
    FOV_1, FOV_2, FOV_3, surface, Bz);


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

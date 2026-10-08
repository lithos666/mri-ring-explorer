function [loc_all_list, angle_all, magnet_dim_all, Br_all] = ...
    GenerateIORingPairFromQuadrant(n_bar, quadrant_loc, quadrant_dim, ...
    quadrant_angle, quadrant_Br)
% GenerateIORingPairFromQuadrant Generate complete IOring layers from an
% upper R-Z quadrant description.
%
% INPUTS
%   n_bar - Number of equally spaced cuboid magnets in every complete ring.
%
%   quadrant_loc   - N-by-2 seed locations [r_center_mm, z_center_mm].
%   quadrant_dim   - N-by-3 local cuboid dimensions [dim_x, dim_y, dim_z]
%                    in mm.
%   quadrant_angle - N-by-1 magnetization angles in degrees.
%   quadrant_Br    - N-by-1 remanence values in T.
%
%   Row i in all four arrays describes the same independently configurable
%   seed magnet. Dimensions use the MagTetris convention: local +Y is the
%   magnetization axis, and local X is tangential to the ring.
%
%   angle_deg is a rotation about the local tangential X-axis, interpreted
%   in the R-Z quadrant as:
%       0 deg : -R (radially inward)
%      90 deg : +Z
%     180 deg : +R (radially outward)
%     270 deg : -Z
%   Intermediate angles are supported (for example, 135 deg points midway
%   between +R and +Z).
%
%   A row with z_center_mm > 0 generates both the specified upper ring and
%   its IOring-symmetric lower ring. A row at z_center_mm = 0 generates one
%   ring only. The lower-ring angle is 180 - angle_deg. This
%   changes +R to -R and -R to +R, while preserving +Z or -Z.
%
% OUTPUTS
%   loc_all_list  - M-by-3 magnet center locations [x, y, z] in mm.
%   angle_all     - M-by-3 [yaw, pitch, roll] angles in degrees, using the
%                   MagTetris convention that an unrotated magnet points +Y.
%   magnet_dim_all- M-by-3 local cuboid dimensions [x, y, z] in mm.
%   Br_all        - 1-by-M remanence values in T.
%
% The generated geometry is checked for intersecting cuboids. Magnets may
% touch at a face, edge, or corner, but a positive-volume overlap raises an
% error before the figures are plotted.
%
% The function also plots the supplied upper-quadrant R-Z footprint.

    validateattributes(n_bar, {'numeric'}, ...
        {'scalar', 'real', 'finite', 'integer', '>=', 1}, mfilename, 'n_bar', 1);
    validateattributes(quadrant_loc, {'numeric'}, ...
        {'2d', 'real', 'finite', 'nonempty', 'ncols', 2}, ...
        mfilename, 'quadrant_loc', 2);
    validateattributes(quadrant_dim, {'numeric'}, ...
        {'2d', 'real', 'finite', 'nonempty', 'ncols', 3}, ...
        mfilename, 'quadrant_dim', 3);
    validateattributes(quadrant_angle, {'numeric'}, ...
        {'vector', 'real', 'finite', 'nonempty'}, ...
        mfilename, 'quadrant_angle', 4);
    validateattributes(quadrant_Br, {'numeric'}, ...
        {'vector', 'real', 'finite', 'nonempty'}, ...
        mfilename, 'quadrant_Br', 5);

    n_layer = size(quadrant_loc, 1);
    if size(quadrant_dim, 1) ~= n_layer || ...
            numel(quadrant_angle) ~= n_layer || numel(quadrant_Br) ~= n_layer
        error('GenerateIORingPairFromQuadrant:InputSizeMismatch', ...
            ['quadrant_loc, quadrant_dim, quadrant_angle, and quadrant_Br ', ...
             'must describe the same number of seed magnets.']);
    end

    quadrant_angle = quadrant_angle(:);
    quadrant_Br = quadrant_Br(:);

    r_center = quadrant_loc(:, 1);
    z_center = quadrant_loc(:, 2);
    dim_x = quadrant_dim(:, 1);
    dim_y = quadrant_dim(:, 2);
    dim_z = quadrant_dim(:, 3);
    Br = quadrant_Br;
    angle = mod(quadrant_angle, 360);

    if any(r_center <= 0)
        error('GenerateIORingPairFromQuadrant:InvalidRadius', ...
            'Every r_center_mm value must be greater than zero.');
    end
    if any(z_center < 0)
        error('GenerateIORingPairFromQuadrant:InvalidZ', ...
            'The input must describe the Z >= 0 quadrant.');
    end
    if any(dim_x <= 0 | dim_y <= 0 | dim_z <= 0)
        error('GenerateIORingPairFromQuadrant:InvalidDimensions', ...
            'All cuboid dimensions must be greater than zero.');
    end
    if any(Br < 0)
        error('GenerateIORingPairFromQuadrant:InvalidRemanence', ...
            'quadrant_Br values must be nonnegative. Use quadrant_angle for direction.');
    end

    mirror_tol_mm = 1e-9;
    rings_per_layer = 1 + (z_center > mirror_tol_mm);
    n_total = n_bar * sum(rings_per_layer);

    loc_all_list = zeros(n_total, 3);
    angle_all = zeros(n_total, 3);
    magnet_dim_all = zeros(n_total, 3);
    Br_all = zeros(1, n_total);

    % Rotate the complete array so every ring has one magnet centered on
    % the negative Y-axis (x = 0, y = -r).
    theta = -90 + (0:n_bar-1).' * (360 / n_bar);
    yaw = theta + 90;
    next_index = 1;

    for layer_index = 1:n_layer
        local_dims = [dim_x(layer_index), dim_y(layer_index), dim_z(layer_index)];

        xy = [r_center(layer_index) * cosd(theta), ...
              r_center(layer_index) * sind(theta)];

        upper_indices = next_index:(next_index + n_bar - 1);
        loc_all_list(upper_indices, :) = [xy, ...
            repmat(z_center(layer_index), n_bar, 1)];
        angle_all(upper_indices, :) = [yaw, zeros(n_bar, 1), ...
            repmat(angle(layer_index), n_bar, 1)];
        magnet_dim_all(upper_indices, :) = repmat(local_dims, n_bar, 1);
        Br_all(upper_indices) = Br(layer_index);
        next_index = next_index + n_bar;

        if z_center(layer_index) > mirror_tol_mm
            lower_angle = mod(180 - angle(layer_index), 360);
            lower_indices = next_index:(next_index + n_bar - 1);

            loc_all_list(lower_indices, :) = [xy, ...
                repmat(-z_center(layer_index), n_bar, 1)];
            angle_all(lower_indices, :) = [yaw, zeros(n_bar, 1), ...
                repmat(lower_angle, n_bar, 1)];
            magnet_dim_all(lower_indices, :) = repmat(local_dims, n_bar, 1);
            Br_all(lower_indices) = Br(layer_index);
            next_index = next_index + n_bar;
        end

    end

    assert_no_overlapping_magnets( ...
        loc_all_list, angle_all, magnet_dim_all);

    plot_quadrant_footprint( ...
        quadrant_loc, quadrant_dim, quadrant_angle);
    plot_half_ioring_footprint( ...
        quadrant_loc, quadrant_dim, quadrant_angle);
end


function assert_no_overlapping_magnets(centers, angles, dimensions)
% Check every generated pair using the separating-axis theorem for OBBs.

    n_magnet = size(centers, 1);
    half_dimensions = dimensions / 2;
    bounding_radius = sqrt(sum(half_dimensions.^2, 2));
    box_axes = magnet_box_axes(angles);
    overlap_tol_mm = 1e-9;

    for first_index = 1:(n_magnet - 1)
        other_indices = (first_index + 1):n_magnet;
        center_delta = centers(other_indices, :) - centers(first_index, :);
        center_distance_squared = sum(center_delta.^2, 2);
        radius_sum = bounding_radius(first_index) + ...
            bounding_radius(other_indices);

        % Bounding spheres cheaply discard pairs that cannot intersect.
        possible_overlap = other_indices( ...
            center_distance_squared < radius_sum.^2);

        for second_index = possible_overlap
            if oriented_boxes_overlap( ...
                    centers(first_index, :), ...
                    squeeze(box_axes(first_index, :, :)), ...
                    half_dimensions(first_index, :), ...
                    centers(second_index, :), ...
                    squeeze(box_axes(second_index, :, :)), ...
                    half_dimensions(second_index, :), ...
                    overlap_tol_mm)
                error('GenerateIORingPairFromQuadrant:OverlappingMagnets', ...
                    ['Generated magnets %d and %d overlap. Their centers ', ...
                     'are [%.6g, %.6g, %.6g] mm and ', ...
                     '[%.6g, %.6g, %.6g] mm. Adjust n_bar, ', ...
                     'quadrant_loc, quadrant_dim, or quadrant_angle.'], ...
                    first_index, second_index, ...
                    centers(first_index, 1), centers(first_index, 2), ...
                    centers(first_index, 3), centers(second_index, 1), ...
                    centers(second_index, 2), centers(second_index, 3));
            end
        end
    end
end


function box_axes = magnet_box_axes(angles)
% Return each magnet's three local unit axes as columns of a 3-by-3 matrix.

    yaw = angles(:, 1);
    roll = angles(:, 3);
    n_magnet = size(angles, 1);

    local_x = [cosd(yaw), sind(yaw), zeros(n_magnet, 1)];
    yawed_y = [-sind(yaw), cosd(yaw), zeros(n_magnet, 1)];
    global_z = repmat([0, 0, 1], n_magnet, 1);
    local_y = cosd(roll) .* yawed_y + sind(roll) .* global_z;
    local_z = -sind(roll) .* yawed_y + cosd(roll) .* global_z;

    box_axes = zeros(n_magnet, 3, 3);
    box_axes(:, :, 1) = local_x;
    box_axes(:, :, 2) = local_y;
    box_axes(:, :, 3) = local_z;
end


function overlaps = oriented_boxes_overlap( ...
    center_a, axes_a, half_dimensions_a, ...
    center_b, axes_b, half_dimensions_b, overlap_tol_mm)
% Test the 15 candidate separating axes of two oriented cuboids.

    candidate_axes = [axes_a, axes_b, zeros(3, 9)];
    next_axis = 7;
    for axis_a = 1:3
        for axis_b = 1:3
            candidate_axes(:, next_axis) = cross( ...
                axes_a(:, axis_a), axes_b(:, axis_b));
            next_axis = next_axis + 1;
        end
    end

    center_delta = (center_b - center_a).';
    overlaps = true;

    for axis_index = 1:size(candidate_axes, 2)
        separating_axis = candidate_axes(:, axis_index);
        axis_length = norm(separating_axis);
        if axis_length < 1e-12
            continue
        end
        separating_axis = separating_axis / axis_length;

        radius_a = sum(half_dimensions_a(:) .* ...
            abs(axes_a.' * separating_axis));
        radius_b = sum(half_dimensions_b(:) .* ...
            abs(axes_b.' * separating_axis));
        center_separation = abs(dot(center_delta, separating_axis));

        if radius_a + radius_b - center_separation <= overlap_tol_mm
            overlaps = false;
            return
        end
    end
end


function plot_quadrant_footprint( ...
    quadrant_loc, quadrant_dim, quadrant_angle)
% Plot the user-supplied R-Z quadrant without drawing extrapolated copies.

    r_center = quadrant_loc(:, 1);
    z_center = quadrant_loc(:, 2);
    dim_y = quadrant_dim(:, 2);
    dim_z = quadrant_dim(:, 3);
    angle = mod(quadrant_angle(:), 360);

    [r_corners, z_corners] = all_quadrant_corners( ...
        r_center, z_center, dim_y, dim_z, angle);

    margin_mm = 0.08 * max([dim_y; dim_z]);
    margin_mm = max(margin_mm, 5);
    r_min = max(0, min(r_corners, [], 'all') - margin_mm);
    r_max = max(r_corners, [], 'all') + margin_mm;
    z_min = min(0, min(z_corners, [], 'all') - margin_mm);
    z_max = max(z_corners, [], 'all') + margin_mm;

    figure(9);
    clf reset;
    %figure('Color', 'w', 'Name', 'IOring quadrant input', 'NumberTitle', 'off', 'Position', [100, 100, width_px, height_px]);
    hold on;

    for i = 1:size(quadrant_loc, 1)
        patch(r_corners(i, :), z_corners(i, :), 'w', ...
            'FaceColor', 'none', 'EdgeColor', 'k', 'LineWidth', 1.8);

        % Put the tail near the face opposite B_r and leave clearance at
        % both ends so the complete arrow remains inside the cuboid.
        [unit_r, unit_z, ~] = quadrant_direction_arrow(angle(i), 1);
        arrow_length = 0.72 * dim_y(i);
        tail_offset = 0.40 * dim_y(i);
        arrow_start_r = r_center(i) - tail_offset * unit_r;
        arrow_start_z = z_center(i) - tail_offset * unit_z;
        arrow_r = arrow_length * unit_r;
        arrow_z = arrow_length * unit_z;

        quiver(arrow_start_r, arrow_start_z, arrow_r, arrow_z, 0, ...
            'Color', 'k', 'LineWidth', 2, ...
            'MaxHeadSize', 3);


    end

    yline(0, '--k', 'Z = 0 mirror plane', 'LabelHorizontalAlignment', 'left');
    grid on;
    box on;
    axis equal;
    xlim([r_min, r_max]);
    ylim([z_min, z_max]);
    xlabel('R / mm');
    ylabel('Z / mm');
    title('IOring input quadrant');

    ax = gca;
    ax.FontSize = 12;
    ax.GridAlpha = 0.25;
    ax.Layer = 'top';
end


function plot_half_ioring_footprint( ...
    quadrant_loc, quadrant_dim, quadrant_angle)
% Plot the R >= 0 half of the IOring: both Z >= 0 and Z <= 0 quadrants.

    mirror_tol_mm = 1e-9;
    angle_upper = mod(quadrant_angle(:), 360);
    mirror_rows = quadrant_loc(:, 2) > mirror_tol_mm;

    half_loc = [ ...
        quadrant_loc; ...
        quadrant_loc(mirror_rows, 1), -quadrant_loc(mirror_rows, 2)];
    half_dim = [quadrant_dim; quadrant_dim(mirror_rows, :)];
    half_angle = [ ...
        angle_upper; ...
        mod(180 - angle_upper(mirror_rows), 360)];

    r_center = half_loc(:, 1);
    z_center = half_loc(:, 2);
    dim_y = half_dim(:, 2);
    dim_z = half_dim(:, 3);

    [r_corners, z_corners] = all_quadrant_corners( ...
        r_center, z_center, dim_y, dim_z, half_angle);

    margin_mm = max(0.08 * max([dim_y; dim_z]), 5);
    r_min = max(0, min(r_corners, [], 'all') - margin_mm);
    r_max = max(r_corners, [], 'all') + margin_mm;
    z_min = min(z_corners, [], 'all') - margin_mm;
    z_max = max(z_corners, [], 'all') + margin_mm;

    figure(11);
    clf reset;
    hold on;

    for i = 1:size(half_loc, 1)
        patch(r_corners(i, :), z_corners(i, :), 'w', ...
            'FaceColor', 'none', 'EdgeColor', 'k', 'LineWidth', 1.8);

        % Use the same fully internal B_r arrow convention as the quadrant
        % plot: the tail begins near the face opposite magnetization.
        [unit_r, unit_z, ~] = quadrant_direction_arrow(half_angle(i), 1);
        arrow_length = 0.72 * dim_y(i);
        tail_offset = 0.40 * dim_y(i);
        arrow_start_r = r_center(i) - tail_offset * unit_r;
        arrow_start_z = z_center(i) - tail_offset * unit_z;

        quiver(arrow_start_r, arrow_start_z, ...
            arrow_length * unit_r, arrow_length * unit_z, 0, ...
            'Color', 'k', 'LineWidth', 2, 'MaxHeadSize', 3);
    end

    yline(0, '--k', 'Z = 0 mirror plane', ...
        'LabelHorizontalAlignment', 'left');
    grid on;
    box on;
    axis equal;
    xlim([r_min, r_max]);
    ylim([z_min, z_max]);
    xlabel('R / mm');
    ylabel('Z / mm');
    title('IOring half cross-section: two R-Z quadrants');

    ax = gca;
    ax.FontSize = 12;
    ax.GridAlpha = 0.25;
    ax.Layer = 'top';
end


function [r_corners, z_corners] = all_quadrant_corners( ...
    r_center, z_center, dim_y, dim_z, angle)

    n_magnet = numel(r_center);
    r_corners = zeros(n_magnet, 4);
    z_corners = zeros(n_magnet, 4);
    signs = [-1, -1; 1, -1; 1, 1; -1, 1];

    for i = 1:n_magnet
        % At the +R seed position, rotated local +Y and +Z project onto R-Z
        % as [-cos(a), sin(a)] and [sin(a), cos(a)], respectively.
        local_y_rz = [-cosd(angle(i)), sind(angle(i))];
        local_z_rz = [sind(angle(i)), cosd(angle(i))];
        center = [r_center(i), z_center(i)];

        for corner_index = 1:4
            corner = center + ...
                signs(corner_index, 1) * dim_y(i) / 2 * local_y_rz + ...
                signs(corner_index, 2) * dim_z(i) / 2 * local_z_rz;
            r_corners(i, corner_index) = corner(1);
            z_corners(i, corner_index) = corner(2);
        end
    end
end


function [arrow_r, arrow_z, label] = quadrant_direction_arrow(angle, scale)
    arrow_r = -scale * cosd(angle);
    arrow_z = scale * sind(angle);

    cardinal_angle = mod(round(angle / 90) * 90, 360);
    if abs(mod(angle - cardinal_angle + 180, 360) - 180) < 1e-9
        switch cardinal_angle
            case 0
                label = '-R (inward)';
            case 90
                label = '+Z';
            case 180
                label = '+R (outward)';
            case 270
                label = '-Z';
        end
    else
        label = sprintf('angle %.3g deg', angle);
    end
end

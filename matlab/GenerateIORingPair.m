function [loc_all_list,angle_all,magnet_dim_all,Br_all] = GenerateIORingPair(n_bar,Br,R_in,Z_c,magnet_dim)
% INPUT:
%       n_bar - number of magnets in one ring
%       Br - remanence for all the magnets
%       R_in - inner radius
%       Z_c - central distance between the two rings
%       magnet_dim - magnet dimension

%% Base Array
% Remanence
Br_all = ones(1,n_bar*2)*Br;

% Magnet dimension
magnet_dim_all = repmat(magnet_dim,2*n_bar,1);

% Angle
angle_yaw = 0:(-360/n_bar):(-360*(n_bar-1)/n_bar);
angle_yaw = [angle_yaw,angle_yaw+180];
angle_yaw = angle_yaw';


angle_pitch = zeros(numel(angle_yaw),1);
angle_roll = zeros(numel(angle_yaw),1);
angle_all = [angle_yaw,angle_pitch,angle_roll];

% Location
R_real = R_in*ones(1,n_bar) + magnet_dim(2)/2;
Z_real = Z_c/2;
loc_xy = zeros(n_bar,2);
for i=1:n_bar
    loc_start_xy = [0,R_real(i)]';
    angle_curr = angle_yaw(i);
    % Rotation about z-axis
    rot_mat = [cosd(angle_curr),-sind(angle_curr);...
               sind(angle_curr),cosd(angle_curr)];
    loc_xy(i,:) = (rot_mat*loc_start_xy)';
end
loc_z = ones(n_bar,1)*Z_real;
loc_all_list = [loc_xy,loc_z;loc_xy,-loc_z];

end


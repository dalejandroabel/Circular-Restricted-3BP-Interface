import plotly.graph_objects as go
import numpy as np
from physics import LagrangePoints, Propagate, ms
def defaultFigure():

    figure = go.Figure()
    figure.update_layout(
        margin=dict(
            l=0,
            r=0,
            b=0,
            t=0,
            pad=0
        ),
        xaxis=go.layout.XAxis(
            showticklabels=False,
            showgrid=False,
            zeroline=False),
        yaxis=go.layout.YAxis(
            showticklabels=False,
            showgrid=False,
            zeroline=False),
        template="seaborn",
    )
    return figure



def plot_trajectory(rows, mu, R1=None, R2=None, db=None, **kwargs):

    centered = int(float(db)) == 2
    fig = go.Figure()
    lagrange = np.array(LagrangePoints(mu)) - (1-mu)
    zeros_3 = np.zeros(3)
    lagrange_len = 2
    fact = 1.1
    all_closed = True
    N = int(kwargs["Npoints"])
    y_s = np.zeros((len(rows), N, 3))
    maxcoords = np.array([0, 0, 0])
    k = 0
    for i, row in rows.iterrows():
        y = Propagate(row, mu, centered=centered, **kwargs)
        y_s[k] = y[:, :3]
        y_s[k, :, 0] += -(1-mu)
        max_trajectory = np.max(abs(y_s[k]), axis=0)
        if np.linalg.norm(y[0, :3]-y[-1, :3]) > 1e-4:
            all_closed = False
        if k == 0:
            maxcoords = max_trajectory
        else:
            for j in range(3):
                maxcoords[j] = maxcoords[j] if (
                    abs(max_trajectory[j]) < maxcoords[j]) else abs(max_trajectory[j])
        k += 1

        if y[:, 0].min() < 0:
            lagrange_len = 3

    for i in range(len(y_s)):

        fig.add_trace(go.Scatter3d(x=y_s[i][:, 0], y=y_s[i][:, 1], z=y_s[i][:, 2],
                                   line=dict(color="black", width=1),
                                   mode="lines", hoverinfo="skip",
                                   name="Orbit {}".format(i+1)))

    if R2:
        x_data, y_data, z_data = ms(0, 0, 0, R2)
        for j in range(3):
            if maxcoords[j] < R2:
                maxcoords[j] = R2

        fig.add_trace(go.Surface(x=x_data, y=y_data, z=z_data,
                                 hoverinfo="skip",  showscale=False,
                                 colorscale="mint",
                                 contours=go.surface.Contours(
                                     x=go.surface.contours.X(highlight=False),
                                     y=go.surface.contours.Y(highlight=False),
                                     z=go.surface.contours.Z(highlight=False))
                                 )
                      )

    fig.add_trace(go.Scatter3d(x=lagrange[:lagrange_len],
                               y=zeros_3[:lagrange_len],
                               z=zeros_3[:lagrange_len],
                               mode='markers+text',
                               marker=dict(size=1, color="black"),
                               text=["L1", "L2", "L3"][:lagrange_len],
                               textposition="top right",
                               name="Lagrange", hoverinfo='skip'))

    if maxcoords[0] < lagrange[1]:
        maxcoords[0] = lagrange[1]
    if lagrange_len == 3:
        if maxcoords[0] < abs(lagrange[2]):
            maxcoords[0] = abs(lagrange[2])
        if R1:
            x_data, y_data, z_data = ms(-1, 0, 0, R1)
            fig.add_trace(go.Surface(x=x_data, y=y_data, z=z_data,
                                     hoverinfo="skip", showscale=False,
                                     colorscale=[[0, "red"], [1, "red"]]))

    if (lagrange_len != 3) and (max(maxcoords) > 0.2):
        limit = max(maxcoords) if centered else 0.15
    else:
        limit = max(maxcoords) 

    ranges = [-limit * fact, limit * fact]
    fig.update_layout(
        scene=dict(
            xaxis=go.layout.scene.XAxis(showspikes=False, title="X [LU]",
                                        mirror=False, range=ranges, showline=True),
            yaxis=go.layout.scene.YAxis(showspikes=False, title="Y [LU]",
                                        mirror=False, range=ranges, showline=True),
            zaxis=go.layout.scene.ZAxis(showspikes=False, title="Z [LU]",
                                        mirror=False, range=ranges, showline=True),

            aspectmode="manual",
            aspectratio=dict(x=1, y=1, z=1),
            camera=dict(eye=dict(x=1.3, y=1.3, z=1.3))
        ),
        legend={"xanchor": "right", "x": 0.9},

        margin=dict(l=0, r=0, b=0, t=0, pad=0),

    )
    if len(y_s) > 10:
        fig.update_layout(showlegend=False)

    return fig, all_closed
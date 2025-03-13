import plotly.graph_objects as go
from utils.db_access import DB
import plotly.express as px
from utils.physics import *
import numpy as np
import pandas as pd
import os

families = DB().getFamilies()
primary_bodies, bodies = DB().getPrimaryBodies()


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


def initialConditionfigure(id_body, source):

    db = "jpl_orbits/" if source == 2 else "pod_orbits/"
    if bodies[bodies.index == id_body].empty:
        return None
    bodyname = bodies[bodies.index == id_body].secondary.iloc[0]
    absolute_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), db + bodyname + ".zip"))
    body_orbits = pd.read_csv(absolute_path, index_col=0, low_memory=False)

    colors = px.colors.qualitative.Dark24
    fig = go.Figure()
    hovertemplate = "<b>x:%{x:.3f}</b><br>vy:%{y:.3f}<br>vz:%{customdata[0]:.3f}<br>period: %{customdata[1]:.5f}"

    c = 0
    updatemenus = [
        dict(type="buttons",
             y=1.2,
             x=0.6,
             direction="left",
             buttons=list([
                 dict(
                     label="Hide Legend",
                     method="relayout",
                     args=["showlegend", False],
                 ),
                 dict(
                     label="Show Legend",
                     method="relayout",
                     args=["showlegend", True],
                 )
             ]))
    ]
    for i in range(len(families)):
        family_orbits = body_orbits[body_orbits.id_family ==
                                    families.iloc[i].name]
        if len(family_orbits) == 0:
            continue
        color = colors[c] if families.iloc[i].name != 9 else "gray"
        name = families.iloc[i].family
        if source == 1:
            hovertemplate = "<b>x:%{x:.3f}</b><br>vy:%{y:.3f}<br>vz:%{customdata[0]:.3f}<br>period: %{customdata[1]:.5f}"
            fig.add_trace(go.Scattergl(x=family_orbits["x0"], y=family_orbits["vy0"],
                                       mode="markers", marker=dict(size=2, color=color),
                                       customdata=family_orbits[[
                                           "vz0", 'period']],
                                       hovertemplate=hovertemplate,
                                       name=name, legendgroup="legend_group_{}".format(i)))
        if source == 2:
            hovertemplate = "<b>x:%{x:.3f}</b><br>vy:%{y:.3f}<br>vz:%{z:.3f}<br>period: %{customdata:.5f}"
            fig.add_trace(go.Scatter3d(x=family_orbits["x0"], y=family_orbits["vy0"], z=family_orbits["vz0"],
                                       mode="markers", marker=dict(size=2, color=color),
                                       customdata=family_orbits['period'],
                                       hovertemplate=hovertemplate,
                                       name=name, legendgroup="legend_group_{}".format(i)))
        c += 1

    if source == 1:
        fig.update_layout(xaxis_title='X', yaxis_title='VY',
                          margin=dict(l=0, r=0, b=0, t=0, pad=0),
                          font=dict(size=10), showlegend=False,

                          updatemenus=updatemenus,
                          legend=dict(
                              yanchor="top",
                              y=0.99,
                              xanchor="left",
                              x=0.01
                          ))
    if source == 2:
        fig.update_layout(
            scene=dict(
                xaxis=go.layout.scene.XAxis(showspikes=False, title="X ",
                                            mirror=False,
                                            showline=True),
                yaxis=go.layout.scene.YAxis(showspikes=False, title="VY ",
                                            mirror=False,
                                            showline=True),
                zaxis=go.layout.scene.ZAxis(showspikes=False, title="VZ ",
                                            mirror=False,
                                            showline=True),
                aspectmode='cube',
                aspectratio=dict(x=1, y=1, z=1),
                camera=dict(
                    eye=dict(
                        x=1.3,
                        y=1.3,
                        z=1.3
                    )
                )),
            updatemenus=updatemenus,
            legend=dict(
                yanchor="top",
                y=0.99,
                xanchor="left",
                x=0.01
            ),
            margin=dict(l=0, r=0, b=0, t=0, pad=0),
            showlegend=False)

    return fig


def parametricMapFigure(data, xColumn, yColumn):

    columns = ["x", "vy", "vz", "period"]
    customcolumns = []
    for column in columns:
        if not (column in [xColumn, yColumn]):
            customcolumns.append(column)
    hover_template = xColumn+":%{x:.3f}<br>"+yColumn+":%{y:.3f}<br>"
    hover_template += customcolumns[0] + ":%{customdata[0]:.3f}<br>" \
        + customcolumns[1]+":%{customdata[1]:.3f}"
    X = data[xColumn]
    Y = data[yColumn]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=X, y=Y, mode='markers',
                             customdata=data[customcolumns],
                             hovertemplate=hover_template,
                             marker=dict(size=5)))

    fig.update_layout(showlegend=False,
                      xaxis_title=xColumn, yaxis_title=yColumn,
                      margin=dict(l=10, r=10, b=10, t=10, pad=0))
    return fig


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
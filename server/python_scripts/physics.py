import numpy as np
from scipy.integrate import solve_ivp
import sys
import json

def ms(x, y, z, radius, resolution=15):
    """Return the coordinates for plotting a sphere centered at (x,y,z)"""
    u, v = np.mgrid[0:2*np.pi:resolution*2j, 0:np.pi:resolution*1j]
    X = radius * np.cos(u)*np.sin(v) + x
    Y = radius * np.sin(u)*np.sin(v) + y
    Z = radius * np.cos(v) + z
    return (X, Y, Z)


def EoM(t, Y, mu):
    x, y, z, vx, vy, vz = Y
    r1 = np.sqrt(x**2+2*x*mu+mu**2+y**2+z**2)
    mmur1 = (1-mu)/(r1**3)

    r2 = np.sqrt(x**2+y**2+z**2-2*x*(1-mu)+(1-mu)**2)
    mur2 = mu/r2**3

    ax = 2*vy+x-mmur1*(x+mu)-mur2*(x-(1-mu))
    ay = -2*vx+y-mmur1*y-mur2*y
    az = -mmur1*z-mur2*z
    return [vx, vy, vz, ax, ay, az]


def Propagate():
    x = float(sys.argv[2])
    y = float(sys.argv[3])
    z = float(sys.argv[4])
    vx = float(sys.argv[5])
    vy = float(sys.argv[6])
    vz = float(sys.argv[7])
    mu = float(sys.argv[8])
    period = float(sys.argv[9])
    method = sys.argv[10]
    atol = float(sys.argv[11])
    rtol = float(sys.argv[12])
    N = int(sys.argv[13])
    centered = False if sys.argv[14] == "false" else True
    Y0 = np.array([x, y, z, vx, vy, vz])
    if not centered:
        Y0[0] += (1-mu)
    t = np.linspace(0, period, int(N))

    Yrot = solve_ivp(EoM, t_span=[0, period], t_eval=t, y0=Y0, args=(
        mu,), atol=atol, rtol=rtol, method=method)
    data = json.dumps({"x": Yrot.y[0].tolist(),
     "y": Yrot.y[1].tolist(),"z": Yrot.y[2].tolist()})
    print(data)
    return data


def LagrangePoints(mu):
    mu1 = 1 - mu
    mu2 = mu
    alpha = (mu2/(3*mu1))**(1/3)
    L1 = mu1 - (alpha - (alpha**2)/3 - (alpha**3)/9-(alpha**4)*(23/81))
    L2 = mu1 + (alpha + (alpha**2)/3 - (alpha**3)/9-(alpha**4)*(31/81))
    mu2mu1 = mu2/mu1
    L3 = -mu2 - 1 - (-(7/12)*(mu2mu1)+(7/12)*((mu2mu1)**2) -
                     (13223/20736)*((mu2mu1)**3))
    return L1, L2, L3

# Differential corrector


class dc():

    def __init__(self, mu, X=None, period=None):
        self.mu = mu
        self.X = X
        self.period = period
        pass

    def _EoM(self, t, Y, mu):
        x, y, z, vx, vy, vz = Y
        r1 = np.sqrt((x+mu)**2+y**2+z**2)
        mmur1 = (1-mu)/(r1**3)

        r2 = np.sqrt((x-(1-mu))**2+y**2+z**2)
        mur2 = mu/r2**3

        ax = 2*vy+x-mmur1*(x+mu)-mur2*(x-(1-mu))
        ay = -2*vx+y-mmur1*y-mur2*y
        az = -mmur1*z-mur2*z
        return [vx, vy, vz, ax, ay, az]

    def _getF(self, x, y, z, mu):

        r1 = np.sqrt(x**2+2*x*mu+mu**2+y**2+z**2)
        mmur1 = (1-mu)/(r1**3)

        r2 = np.sqrt(x**2+y**2+z**2-2*x*(1-mu)+(1-mu)**2)
        mmur2 = mu/r2**3
        # Derivative of state vector
        # Diagonals

        dg1dx = 1 - mmur1*(1 - 3*(x+mu)**2/(r1**2)) - \
            mmur2*(1 - 3*(x+mu-1)**2/(r2**2))
        dg2dy = 1 - mmur1*(1 - 3*(y**2)/(r1**2)) - mmur2*(1 - 3*(y**2)/(r2**2))
        dg3dz = -mmur1*(1 - 3*(z**2)/(r1**2)) - mmur2*(1 - 3*(z**2)/(r2**2))

        # G12
        dg1dy = 3*((1-mu)*y*(x+mu)/r1**5 + mu*y*(x+mu-1)/r2**5)
        # G13
        dg1dz = 3*((1-mu)*z*(x+mu)/r1**5 + mu*z*(x+mu-1)/r2**5)
        # G23
        dg2dz = 3*(1-mu)*z*y/r1**5 + 3*mu*z*y/r2**5

        I = np.identity(3)

        G = np.array([[dg1dx, dg1dy, dg1dz],
                      [dg1dy, dg2dy, dg2dz],
                      [dg1dz, dg2dz, dg3dz]])  # Symmetric matrix

        H = np.array([[0, 2, 0],
                      [-2, 0, 0],
                      [0, 0, 0]])

        F = np.zeros((6, 6), dtype=np.double)
        F[0:3, 3:6] = I
        F[3:6, 0:3] = G
        F[3:6, 3:6] = H

        return F

    def _propagateSTM(self, t, Y, mu):
        x, y, z, vx, vy, vz = Y[36:]
        STM = Y[:36].reshape((6, 6))

        dydt = self._EoM(t, [x, y, z, vx, vy, vz], mu)
        F = self._getF(x, y, z, mu)

        dSTMdt = np.array(np.matmul(F, STM)).reshape((36))
        return np.concatenate([dSTMdt, dydt])

    def _initial_conditions(self, X):
        x, y, z, vx, vy, vz = X
        initial_state = np.zeros(42)
        initial_state[:36] = np.identity(6).flatten()
        initial_state[36:42] = [x, y, z, vx, vy, vz]
        return initial_state

    def _Ncrossings(self, t, y, mu):
        return y[36:][1]

    def _propagate_mid_half(self, X, mu, t):
        X = self._initial_conditions(X)
        X[36] += (1-mu)
        t_span = [0, t]
        solution = solve_ivp(self._propagateSTM, y0=X, t_span=t_span,
                             events=(self._Ncrossings), args=(mu,), rtol=1e-12, atol=1e-12, dense_output=True)
        event = np.argmin(np.abs(solution.t_events[0]-t/2))
        stm = solution.y_events[0][event][:36].reshape((6, 6))
        y = solution.y_events[0][event][36:]
        t = solution.t_events[0][event]
        return stm, y, t*2

    def _DiffCorrectFixed(self, STM, Xdot, Xmid, fixed, Xnew):
        Index1 = None
        Index2 = None
        if fixed == "x":
            Index1 = 4
            Index2 = 5
        if fixed == "vy":
            Index1 = 0
            Index2 = 5
        if fixed == "vz":
            Index1 = 0
            Index2 = 4

        deltaMatrix = np.array([[-Xmid[2]], [-Xmid[3]]])
        partialSTM = np.array([[STM[2, Index1], STM[2, Index2]],
                               [STM[3, Index1], STM[3, Index2]]])
        halfState = np.array([[Xdot[2]], [Xdot[3]]])
        partialSTM2 = np.array(
            [STM[1, Index1], STM[1, Index2]]).reshape((1, 2))
        inverseMatrix = np.linalg.inv(
            partialSTM-(1/Xdot[1])*np.matmul(halfState, partialSTM2))
        changeMatrix = np.matmul(inverseMatrix, deltaMatrix)
        Xnew[Index1] += changeMatrix[0, 0]
        Xnew[Index2] += changeMatrix[1, 0]
        return Xnew

    def DiffCorrectorSteps(self, X, t, fixed):
        mu = self.mu
        X_new = X.copy()

        STM, X_mid, t = self._propagate_mid_half(X_new, mu, t)
        if abs(X_mid[1]) > 1e-10 or abs(X_mid[3]) > 1e-10:
            STM, X_mid, t = self._propagate_mid_half(
                X_new, mu, t)
            Xdot = self._EoM(0, X_mid, mu)
            X_new = self._DiffCorrectFixed(STM, Xdot, X_mid, fixed, X_new)
            data = json.dumps({
            "x": X_new[0],
            "y": X_new[1],
            "z": X_new[2],
            "vx": X_new[3],
            "vy": X_new[4],
            "vz": X_new[5],
            "period":t,
            "deltax": abs(X[0]-X_new[0]),
            "deltavy": abs(X[4]-X_new[4]),
            "deltavz": abs(X[5]-X_new[5])})
            print(data)
            return X_new, t
        data = json.dumps({
            "x": X_new[0],
            "y": X_new[1],
            "z": X_new[2],
            "vx": X_new[3],
            "vy": X_new[4],
            "vz": X_new[5],
            "period":t,
            "deltax": abs(X[0]-X_new[0]),
            "deltavy": abs(X[4]-X_new[4]),
            "deltavz": abs(X[5]-X_new[5])})
        print(data)
        return X_new, t

    def DiffCorrector(self):
        mu = self.mu
        X = self.X
        t = self.period
        X_new = X.copy()
        STM, X_mid, oldT = self._propagate_mid_half(X_new, mu, t)
        while abs(X_mid[1]) > 1e-11 or abs(X_mid[3]) > 1e-11:
            STM, X_mid, t = self._propagate_mid_half(X_new, mu, t)
            ax = self._EoM(0, X_mid, mu)[3]  # Aceleration x d(vx)/(dt)
            deltavy = -X_mid[3]/(STM[3, 4]-ax*STM[1, 4]/X_mid[4])
            X_new[4] += deltavy
            print("delta vy = {:.4e}".format(deltavy))
        return X_new, t

if __name__ == "__main__":
    if sys.argv[1] == "Propagate":
        Propagate()
    
    if sys.argv[1] == "Correct":
        x = float(sys.argv[2])
        y = float(sys.argv[3])
        z = float(sys.argv[4])
        vx = float(sys.argv[5])
        vy = float(sys.argv[6])
        vz = float(sys.argv[7])
        mu = float(sys.argv[8])
        period = float(sys.argv[9])
        centered = False if sys.argv[10] == "false" else True

        X = np.array([x,y,z,vx,vy,vz])

        system = dc(mu,X,period)
        system.DiffCorrectorSteps(X,period,"x")
    if sys.argv[1] == "Lagrange":
        mu = float(sys.argv[2])
        L1, L2, L3 = LagrangePoints(mu)
        data = json.dumps({"L1": L1, "L2": L2, "L3": L3})
        print(data)

    if sys.argv[1] == "Sphere":
        R2 = float(sys.argv[2])
        N = float(sys.argv[3])
        mu = float(sys.argv[4])
        if N == 1:
            x_data, y_data, z_data = ms(-(1-mu), 0, 0, R2)
        else:
            x_data, y_data, z_data = ms(0, 0, 0, R2)
        data = json.dumps({"x": x_data.tolist(), "y": y_data.tolist(), "z": z_data.tolist()})
        print(data)
    

    